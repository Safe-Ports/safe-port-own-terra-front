import { useEffect, useMemo, useState } from "react";
import { HiKey, HiArchiveBox, HiArrowLeft, HiBuildingOffice2, HiCheckCircle, HiClipboardDocument, HiHomeModern, HiMagnifyingGlass, HiPencilSquare, HiPlus, HiSquares2X2, HiUserGroup, HiUserPlus, HiUsers } from "react-icons/hi2";
import { useNavigate, useSearchParams } from "react-router-dom";
import FieldError from "@/components/shared/FieldError";
import Modal from "@/components/ui/Modal";
import { useAppContext } from "@/context/AppContext";
import EcoLayout from "@/pages/Ecosystem/EcoLayout";
import { usePropertiesData } from "../../data/PropertiesDataContext";
import { COMMUNITY_KIND_LABEL, DEFAULT_UNIT_MEMBER_FLAGS, EMPTY_COMMUNITY, EMPTY_COMMUNITY_PERSON, EMPTY_UNIT_MEMBER, PERSON_UNIT_ROLE_HINT, PERSON_UNIT_ROLE_LABEL, personUnitRoles, validateCommunity, validateCommunityPerson, validateUnitMember } from "./communityModel";
import { PROPERTIES_MVP_SCOPE } from "../../mvpScope";
import CommunityOnboarding from "./CommunityOnboarding";
import CommunityCards from "./CommunityCards";
import UnitMonitorPanel from "../monitoring/UnitMonitorPanel";
import MediaGallery from "../media/MediaGallery";
import { UNIT_STATUS_LABEL, UNIT_TYPE_LABEL, validateUnit } from "../units/unitModel";
import CommunityDetail from "./CommunityDetail";
import { useQueryClient } from "@tanstack/react-query";
import propertiesService from "@/services/propertiesService";
import { BUILDING_AMENITIES, BUILDING_DIMENSIONS, UNIT_SPEC_FEATURES, buildingSpecDraft, buildingSpecPayload, unitSpecDraft } from "../specs/specModel";
import { buildingSpecKey, useBuildingSpec } from "../specs/useBuildingSpec";
import PortalAccessModal from "../portal/PortalAccessModal";
import "./community-workspace.css";

// Unidades es la pestaña central: ahí se asigna a cada persona a su unidad
// (el vínculo del que dependen cuotas, votos, amenidades y portal). Los datos de
// la comunidad ya no son pestaña: se despliegan al elegir su tarjeta.
const tabs=[
  ["units","Unidades",HiHomeModern,"Quién vive, quién paga"],
  ["directory","Directorio",HiUserGroup,"Contactos y portal"],
];
// Pestañas anteriores que siguen llegando por enlaces guardados o del menú.
const TAB_ALIAS={monitoring:"units",relations:"units",configuration:"units"};
const resolveTab=(key)=>{const tab=TAB_ALIAS[key]||key;return tabs.some(([value])=>value===tab)?tab:null;};
const isCommittee=(roles=[])=>roles.includes("committee")||roles.includes("board_member");

function CommunityWorkspace(){
  const navigate=useNavigate();
  const {canUseFeature,showToast}=useAppContext();
  const canWrite=canUseFeature("properties.write");
  const {properties,units,communities,communityPeople,personUnitRelations,condoCharges,packages,reservations,votes,propertiesLoading,propertiesError,retryProperties,addCommunity,updateCommunity,updateUnit,changeUnitStatus,addCommunityPerson,updateCommunityPerson,archiveCommunityPerson,addUnitMember,archivePersonUnitRelation}=usePropertiesData();
  // `?tab=directory` llega desde "Invitaciones al portal" en el Centro de operación.
  // `?unit=` y `?community=` llegan de los enlaces "ver unidad" (cuotas, menú).
  const [params]=useSearchParams();
  const [activeTab,setActiveTab]=useState(resolveTab(params.get("tab"))||"units");
  const [monitorUnitId,setMonitorUnitId]=useState(params.get("unit")||"");
  const [communityId,setCommunityId]=useState(params.get("community")||communities[0]?.id||"");
  const [communityDraft,setCommunityDraft]=useState(EMPTY_COMMUNITY);
  const [communityErrors,setCommunityErrors]=useState({});
  const [creatingCommunity,setCreatingCommunity]=useState(false);
  const [editingCommunity,setEditingCommunity]=useState(false);
  const [detailOpen,setDetailOpen]=useState(false);
  const [unitEditId,setUnitEditId]=useState(null);
  const [unitDraft,setUnitDraft]=useState(null);
  const [unitErrors,setUnitErrors]=useState({});
  const [buildingDraft,setBuildingDraft]=useState(null);
  const queryClient=useQueryClient();
  const [query,setQuery]=useState("");
  const [directoryGroup,setDirectoryGroup]=useState("all");
  const [directoryPage,setDirectoryPage]=useState(1);
  const [personModal,setPersonModal]=useState(null);
  const [personDraft,setPersonDraft]=useState(EMPTY_COMMUNITY_PERSON);
  const [personErrors,setPersonErrors]=useState({});
  const [portalPerson,setPortalPerson]=useState(null);
  const [memberUnitId,setMemberUnitId]=useState(null);
  const [memberDraft,setMemberDraft]=useState(EMPTY_UNIT_MEMBER);
  const [memberErrors,setMemberErrors]=useState({});
  const [savingMember,setSavingMember]=useState(false);
  const selectedCommunity=communities.find(item=>item.id===communityId)||communities[0];
  const selectedProperty=properties.find(item=>item.id===selectedCommunity?.propertyId);
  const buildingSpec=useBuildingSpec(selectedCommunity?.inmuebleId);
  const communityUnits=units.filter(item=>item.propertyId===selectedCommunity?.propertyId&&item.status!=="archived");
  const activeRelations=personUnitRelations.filter(item=>item.communityId===selectedCommunity?.id&&item.status!=="archived");
  // Los módulos operativos (cuotas, amenidades, votaciones, portal) exigen
  // unidades, personas y una relación que diga quién paga o vota. Sin esto el
  // usuario llegaba a formularios que fallaban al guardar, sin explicación.
  const readiness=[
    {key:"units",label:"Registra las unidades",hint:"Departamentos, casas, locales o espacios de esta comunidad.",done:communityUnits.length>0,action:()=>navigate("/properties/unidades"),cta:"Ir a Unidades"},
    {key:"people",label:"Asigna personas a cada unidad",hint:"Quién es dueño, quién vive y quién paga. Sin esto no hay a quién cobrar ni quién vote.",done:activeRelations.length>0,action:()=>setActiveTab("units"),cta:"Ir a Unidades"},
  ];
  const pendingSteps=readiness.filter(step=>!step.done);

  // El directorio y las relaciones están acotados a la comunidad activa: al
  // vincular a alguien en otra comunidad, desaparece de esta sin explicación
  // ("la persona que registré ya no aparece"). Se cuenta para poder decirlo.
  const peopleElsewhere=useMemo(()=>communityPeople.filter(person=>person.status!=="archived"&&person.communityIds?.length&&!person.communityIds.includes(selectedCommunity?.id)),[communityPeople,selectedCommunity?.id]);


  useEffect(()=>{const tab=resolveTab(params.get("tab"));if(tab)setActiveTab(tab);if(params.get("unit"))setMonitorUnitId(params.get("unit"));if(params.get("community"))setCommunityId(params.get("community"));},[params]);
  // Un enlace a una unidad abre la comunidad a la que pertenece.
  useEffect(()=>{const unit=units.find(item=>item.id===monitorUnitId);const owner=unit&&communities.find(item=>item.propertyId===unit.propertyId);if(owner&&owner.id!==communityId)setCommunityId(owner.id);},[monitorUnitId,units,communities]);
  // Elegir otra comunidad a mano suelta la unidad del enlace; si no, al recargar
  // los datos el efecto de arriba la regresaría a la comunidad de esa unidad.
  // Tocar la tarjeta ya elegida pliega o despliega su detalle.
  const selectCommunity=(id)=>{if(id===selectedCommunity?.id){setDetailOpen(open=>!open);return;}setCommunityId(id);setMonitorUnitId("");setDetailOpen(true);};

  useEffect(()=>{
    if(!communityId&&communities[0])setCommunityId(communities[0].id);
    if(selectedCommunity)setCommunityDraft({...selectedCommunity});
  },[communityId,communities,selectedCommunity?.id]);

  const relatedPersonIds=useMemo(()=>new Set(activeRelations.map(item=>item.personId)),[activeRelations]);
  // `communityIds` se deriva de las relaciones persona-unidad, así que una
  // persona recién creada no pertenece todavía a ninguna comunidad. Sin
  // incluirla acá quedaba guardada en el backend pero invisible en el
  // directorio y, como el modal de vincular usa esta misma lista, tampoco se
  // podía vincular nunca: un callejón sin salida.
  // Las etiquetas del directorio salen de los vínculos con unidades (dueño,
  // residente, inquilino) más el rol general de comité: un solo origen.
  const personTags=(person)=>[...personUnitRoles(person.id,activeRelations).map(role=>PERSON_UNIT_ROLE_LABEL[role]),...(isCommittee(person.roles)?["Comité"]:[])];
  const people=useMemo(()=>communityPeople.filter(person=>person.status!=="archived"&&(person.communityIds?.includes(selectedCommunity?.id)||relatedPersonIds.has(person.id)||!person.communityIds?.length)&&(!query.trim()||[person.name,person.email,person.phone,...personTags(person)].join(" ").toLowerCase().includes(query.trim().toLowerCase()))),[communityPeople,query,relatedPersonIds,activeRelations,selectedCommunity?.id]);
  const directoryPeople=useMemo(()=>people.filter(person=>{if(directoryGroup==="all")return true;const links=activeRelations.filter(item=>item.personId===person.id);return directoryGroup==="responsible"?links.some(item=>item.role==="owner"||item.isPaymentResponsible)||isCommittee(person.roles):links.some(item=>["resident","tenant"].includes(item.role));}),[people,directoryGroup,activeRelations]);
  const directoryPages=Math.max(1,Math.ceil(directoryPeople.length/10));
  const visiblePeople=directoryPeople.slice((directoryPage-1)*10,directoryPage*10);

  useEffect(()=>setDirectoryPage(1),[query,directoryGroup,selectedCommunity?.id]);

  const saveCommunity=async(event)=>{
    event.preventDefault();
    const errors=validateCommunity(communityDraft);setCommunityErrors(errors);
    if(Object.keys(errors).length)return;
    try{if(creatingCommunity){const created=await addCommunity(communityDraft);setCommunityId(created.id);setCreatingCommunity(false);showToast("Comunidad guardada","success");}
    else{await updateCommunity(selectedCommunity.id,communityDraft);if(buildingDraft&&selectedCommunity.inmuebleId){await propertiesService.specs.save(selectedCommunity.inmuebleId,buildingSpecPayload(buildingDraft));await queryClient.invalidateQueries({queryKey:buildingSpecKey(selectedCommunity.inmuebleId)});}setEditingCommunity(false);showToast("Comunidad actualizada","success");}}catch(error){showToast(error.response?.data?.error?.message||error.message,"warning")}
  };
  const openNewCommunity=()=>{setCreatingCommunity(true);setCommunityDraft(EMPTY_COMMUNITY);setCommunityErrors({});};
  // La ficha del edificio sólo se envía si ya se pudo leer: así no se pisa una
  // ficha existente con una vacía cuando la consulta falló.
  const openEditCommunity=()=>{setCommunityDraft({...selectedCommunity});setCommunityErrors({});setBuildingDraft(buildingSpec.isSuccess?buildingSpecDraft(buildingSpec.data):null);setEditingCommunity(true);};
  const closeEditCommunity=()=>{setEditingCommunity(false);setCommunityDraft({...selectedCommunity});};
  // ── Edición rápida de una unidad desde su detalle (datos + fotos) ──
  const editedUnit=units.find(unit=>unit.id===unitEditId);
  const openEditUnit=(id)=>{const unit=units.find(item=>item.id===id);if(!unit)return;setUnitEditId(id);setUnitErrors({});setUnitDraft({propertyId:unit.propertyId,ownerId:unit.ownerId||"",identifier:unit.identifier,type:unit.type,floor:unit.floor||"",area:String(unit.area||""),bedrooms:String(unit.bedrooms||""),bathrooms:String(unit.bathrooms||""),suggestedRent:String(unit.suggestedRent||""),status:unit.status,description:unit.description||"",specs:unitSpecDraft(unit.attributes)});};
  const updateUnitDraft=(field,value)=>{setUnitDraft(current=>({...current,[field]:value}));setUnitErrors(current=>({...current,[field]:undefined}));};
  const updateUnitSpec=(field,value)=>setUnitDraft(current=>({...current,specs:{...current.specs,[field]:value}}));
  const saveUnit=async(event)=>{event.preventDefault();const errors=validateUnit(unitDraft,units,unitEditId);setUnitErrors(errors);if(Object.keys(errors).length)return;try{await updateUnit(unitEditId,unitDraft);if(editedUnit&&unitDraft.status!==editedUnit.status)await changeUnitStatus(unitEditId,unitDraft.status);setUnitEditId(null);showToast("Unidad actualizada","success");}catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}};
  const openPerson=(person=null)=>{setPersonModal(person?.id||"new");setPersonDraft(person?{...EMPTY_COMMUNITY_PERSON,...person,communityIds:[...new Set([...(person.communityIds||[]),selectedCommunity.id])],roles:isCommittee(person.roles)?["committee"]:[]}:{...EMPTY_COMMUNITY_PERSON,communityIds:[selectedCommunity.id]});setPersonErrors({});};
  const savePerson=async(event)=>{event.preventDefault();const errors=validateCommunityPerson(personDraft);setPersonErrors(errors);if(Object.keys(errors).length)return;const scopedDraft={...personDraft,communityIds:[...new Set([...(personDraft.communityIds||[]),selectedCommunity.id])]};try{if(personModal==="new")await addCommunityPerson(scopedDraft);else await updateCommunityPerson(personModal,scopedDraft);setPersonModal(null);showToast(personModal==="new"?"Persona agregada al directorio":"Persona actualizada","success")}catch(error){showToast(error.response?.data?.error?.message||error.message,"warning")}};
  // ── Pieza central: agregar a una persona a una unidad en un solo paso ──
  const memberUnit=communityUnits.find(unit=>unit.id===memberUnitId);
  const unitLinks=activeRelations.filter(item=>item.unitId===memberUnitId);
  const currentPayer=unitLinks.find(item=>item.isPaymentResponsible);
  // properties-back permite un solo responsable de pago activo por unidad: si ya
  // hay uno, no se sugiere otro y se explica por qué.
  const flagsFor=(role)=>({...DEFAULT_UNIT_MEMBER_FLAGS[role],...(currentPayer?{isPaymentResponsible:false}:{})});
  const openMember=(unitId)=>{const hasPayer=activeRelations.some(item=>item.unitId===unitId&&item.isPaymentResponsible);const hasPrimary=activeRelations.some(item=>item.unitId===unitId&&item.isPrimary);setMonitorUnitId(unitId);setMemberUnitId(unitId);setMemberDraft({...EMPTY_UNIT_MEMBER,isPrimary:!hasPrimary,...(hasPayer?{isPaymentResponsible:false}:{})});setMemberErrors({});};
  const setMemberRole=(role)=>setMemberDraft(current=>({...current,role,...flagsFor(role)}));
  const directoryChoices=useMemo(()=>communityPeople.filter(person=>person.status!=="archived"&&!unitLinks.some(link=>link.personId===person.id)).sort((a,b)=>a.name.localeCompare(b.name,"es")),[communityPeople,unitLinks]);
  const saveMember=async(event)=>{event.preventDefault();const errors=validateUnitMember(memberDraft);setMemberErrors(errors);if(Object.keys(errors).length)return;setSavingMember(true);try{await addUnitMember({...memberDraft,unitId:memberUnitId,communityId:selectedCommunity.id});const name=memberDraft.mode==="existing"?communityPeople.find(person=>person.id===memberDraft.personId)?.name:memberDraft.name.trim();setMemberUnitId(null);showToast(`${name} quedó como ${PERSON_UNIT_ROLE_LABEL[memberDraft.role].toLowerCase()} de ${memberUnit?.identifier}`,"success");}catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}finally{setSavingMember(false);}};
  const unlinkMember=async(link)=>{try{await archivePersonUnitRelation(link.id);showToast("Persona quitada de la unidad. Su historial se conserva.","success");}catch(error){showToast(error.response?.data?.error?.message||error.message,"warning");}};
  // Cada alerta de tarjeta lleva a donde se atiende: la configuración pendiente
  // se resuelve aquí mismo; paquetería vive en Accesos; lo demás en Operación
  // diaria, ya con la comunidad elegida.
  const openAlert=(community,alert)=>{
    if(alert.module==="setup"){setCommunityId(community.id);setMonitorUnitId("");setActiveTab("units");return;}
    if(alert.module==="packages"){navigate("/properties/accesos");return;}
    navigate(`/properties/comunidades/operacion?module=${alert.module}&community=${community.id}`);
  };
  const copyContact=async(person)=>{const text=[person.name,person.email,person.phone].filter(Boolean).join(" · ");try{await navigator.clipboard.writeText(text);showToast("Contacto copiado","success");}catch{showToast("No se pudo copiar el contacto","warning");}};

  if(propertiesLoading&&!communities.length)return <EcoLayout active="properties" title="Comunidades" subtitle="Preparando tu espacio"><main className="community-page"><section className="community-onboarding-status"><span className="community-loading-dot"/><h1>Cargando tu organización…</h1><p>Estamos revisando inmuebles, unidades y comunidades.</p></section></main></EcoLayout>;
  if(propertiesError&&!communities.length)return <EcoLayout active="properties" title="Comunidades" subtitle="No pudimos cargar la información"><main className="community-page"><section className="community-onboarding-status"><h1>No pudimos abrir Comunidades</h1><p>{propertiesError.response?.data?.error?.message||propertiesError.message}</p><button type="button" onClick={retryProperties}>Reintentar</button></section></main></EcoLayout>;
  if(!communities.length)return <EcoLayout active="properties" title="Comunidades" subtitle="Configuración inicial"><main className="community-page"><button className="community-back" type="button" onClick={()=>navigate("/properties")}><HiArrowLeft/> Volver a Properties</button><CommunityOnboarding/></main></EcoLayout>;

  return <EcoLayout active="properties" title="Comunidades" subtitle="OwnTerra Properties · Espacios compartidos">
    <main className="community-page">
      <button className="community-back" type="button" onClick={()=>navigate("/properties")}><HiArrowLeft/> Volver a Properties</button>
      <header className="community-heading"><div><img className="community-heading-logo" src="/brand/communities-logo-color.svg" alt="Communities"/><span>Comunidades y complejos</span><h1>La comunidad, conectada.</h1><p>Configura condominios, privadas, plazas, complejos de cabañas u hoteles y conecta sus espacios con la operación compartida.</p></div><button type="button" onClick={openNewCommunity} disabled={!canWrite}><HiPlus/> Nueva comunidad</button></header>
      <aside className="community-prototype-note">Configuración, directorio y relaciones persistidos en OwnTerra Properties.</aside>

      <CommunityCards communities={communities} selectedId={selectedCommunity?.id} expanded={detailOpen} onSelect={selectCommunity} onAlert={openAlert} data={{units,personUnitRelations,condoCharges,packages,reservations,votes}}/>

      {detailOpen&&selectedCommunity?<CommunityDetail community={selectedCommunity} property={selectedProperty} unitsCount={communityUnits.length} peopleCount={new Set(activeRelations.map(item=>item.personId)).size} canWrite={canWrite} onEdit={openEditCommunity} onClose={()=>setDetailOpen(false)}/>:null}

      {pendingSteps.length?<section className="community-readiness"><header><div><span>Preparación</span><h2>Falta{pendingSteps.length>1?"n":""} {pendingSteps.length} paso{pendingSteps.length>1?"s":""} para operar</h2><p>Cuotas, amenidades, votaciones y el portal de residentes necesitan esta base.</p></div><strong>{readiness.length-pendingSteps.length}/{readiness.length}</strong></header><ol>{readiness.map(step=><li key={step.key} className={step.done?"done":""}><i>{step.done?<HiCheckCircle/>:null}</i><div><strong>{step.label}</strong><small>{step.hint}</small></div>{step.done?<em>Listo</em>:<button type="button" onClick={step.action} disabled={!canWrite}>{step.cta}</button>}</li>)}</ol></section>:null}

      <nav className="community-tabs" aria-label="Configuración de comunidad">{tabs.map(([key,label,Icon,hint])=><button type="button" key={key} className={activeTab===key?"active":""} onClick={()=>setActiveTab(key)}><Icon/><span><strong>{label}</strong><small>{hint}</small></span></button>)}<button type="button" className="community-operations-entry" onClick={()=>navigate("/properties/comunidades/operacion")}><HiSquares2X2/><span><strong>Operación diaria</strong><small>Cuotas, avisos y amenidades</small></span></button></nav>


      {activeTab==="directory"?<section className="community-panel"><header><div><span>Contactos</span><h2>Directorio de la comunidad</h2><p>Datos de contacto, acceso al portal y comité. Para decir quién es dueño o vive en cada unidad, usa la pestaña Unidades.</p></div><button type="button" onClick={()=>openPerson()} disabled={!canWrite}><HiPlus/> Agregar contacto</button></header><div className="community-directory-tools"><label><HiMagnifyingGlass/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nombre, correo, teléfono o rol"/></label><span>{directoryPeople.length} personas en {selectedCommunity?.name}{peopleElsewhere.length?<em className="community-directory-elsewhere"> · {peopleElsewhere.length} vinculada{peopleElsewhere.length>1?"s":""} a otra comunidad</em>:null}</span></div><nav className="community-directory-groups" aria-label="Categorías del directorio"><button type="button" className={directoryGroup==="all"?"active":""} onClick={()=>setDirectoryGroup("all")}>Todas</button><button type="button" className={directoryGroup==="responsible"?"active":""} onClick={()=>setDirectoryGroup("responsible")}>Dueños y encargados</button><button type="button" className={directoryGroup==="residents"?"active":""} onClick={()=>setDirectoryGroup("residents")}>Habitantes actuales</button></nav><div className="community-people">{visiblePeople.map(person=>{const relations=activeRelations.filter(item=>item.personId===person.id);return <article key={person.id}><span className="community-avatar">{person.name.split(" ").slice(0,2).map(word=>word[0]).join("")}</span><div><strong>{person.name}</strong><small>{person.personType==="company"?"Empresa":"Persona"} · {person.email||"Sin correo"} · {person.phone||"Sin teléfono"}</small><p>{personTags(person).map(tag=><i key={tag}>{tag}</i>)}</p></div><div className="community-person-links"><small>Unidades</small><strong>{relations.length}</strong>{relations.length?null:<button type="button" className="community-person-unlinked" onClick={()=>setActiveTab("units")}>Sin unidad</button>}<em>{person.communicationPreference==="whatsapp"?"WhatsApp":person.communicationPreference==="phone"?"Teléfono":"Correo"}</em></div><footer><button type="button" onClick={()=>copyContact(person)} aria-label={`Copiar contacto de ${person.name}`}><HiClipboardDocument/></button><button type="button" onClick={()=>setPortalPerson(person)} aria-label={`Acceso al portal de ${person.name}`} title="Acceso al portal"><HiKey/></button>{canWrite?<><button type="button" onClick={()=>openPerson(person)} aria-label={`Editar ${person.name}`}><HiPencilSquare/></button><button type="button" onClick={()=>archiveCommunityPerson(person.id)} aria-label={`Archivar ${person.name}`}><HiArchiveBox/></button></>:null}</footer></article>})}</div><footer className="community-directory-pagination"><span>Mostrando {visiblePeople.length} de {directoryPeople.length}</span><div><button type="button" disabled={directoryPage===1} onClick={()=>setDirectoryPage(page=>page-1)}>Anterior</button><strong>{directoryPage} / {directoryPages}</strong><button type="button" disabled={directoryPage===directoryPages} onClick={()=>setDirectoryPage(page=>page+1)}>Siguiente</button></div></footer></section>:null}

      {activeTab==="units"&&selectedCommunity?<UnitMonitorPanel community={selectedCommunity} unitId={monitorUnitId} canWrite={canWrite} onSelectUnit={setMonitorUnitId} onEditUnit={openEditUnit} onAddMember={openMember} onUnlink={unlinkMember} onOpenCharges={()=>navigate(`/properties/comunidades/operacion?module=charges&community=${selectedCommunity.id}`)}/>:null}
    </main>

    {portalPerson?<PortalAccessModal person={portalPerson} units={communityUnits} onClose={()=>setPortalPerson(null)}/>:null}

    <Modal open={creatingCommunity} onClose={()=>setCreatingCommunity(false)} title="Nueva comunidad" subtitle="Conecta un inmueble existente con su operación comunitaria." icon={<HiBuildingOffice2/>} width="max-w-[660px]" footer={<><button type="button" onClick={()=>setCreatingCommunity(false)}>Cancelar</button><button type="submit" form="new-community-form">Crear comunidad</button></>}><form id="new-community-form" className="properties-form" onSubmit={saveCommunity}><section className="properties-form-section"><div className="properties-form-grid"><label><span>Tipo</span><select value={communityDraft.kind} onChange={event=>setCommunityDraft({...communityDraft,kind:event.target.value})}>{Object.entries(COMMUNITY_KIND_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label><span>Inmueble asociado</span><select value={communityDraft.propertyId} onChange={event=>setCommunityDraft({...communityDraft,propertyId:event.target.value})}><option value="">Seleccionar inmueble</option>{properties.filter(item=>item.status!=="archived"&&!communities.some(community=>community.propertyId===item.id)).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select><FieldError msg={communityErrors.propertyId}/></label><label className="properties-form-wide"><span>Nombre de la comunidad</span><input value={communityDraft.name} onChange={event=>setCommunityDraft({...communityDraft,name:event.target.value})}/><FieldError msg={communityErrors.name}/></label><label><span>Cuota base mensual <small>Opcional</small></span><input type="number" min="0" value={communityDraft.cuotaBase} onChange={event=>setCommunityDraft({...communityDraft,cuotaBase:event.target.value})}/><FieldError msg={communityErrors.cuotaBase}/></label><label><span>Día de cobro <small>1–28</small></span><input type="number" min="1" max="28" value={communityDraft.billingDay} onChange={event=>setCommunityDraft({...communityDraft,billingDay:event.target.value})}/><FieldError msg={communityErrors.billingDay}/></label></div></section></form></Modal>

    <Modal open={Boolean(personModal)} onClose={()=>setPersonModal(null)} title={personModal==="new"?"Agregar contacto":"Editar contacto"} subtitle={`Datos de contacto en ${selectedCommunity?.name||"la comunidad"}. La relación con cada unidad se define en Unidades.`} icon={<HiUsers/>} width="max-w-[720px]" footer={<><button type="button" onClick={()=>setPersonModal(null)}>Cancelar</button><button type="submit" form="community-person-form">Guardar persona</button></>}><form id="community-person-form" className="properties-form" onSubmit={savePerson}><section className="properties-form-section"><div className="properties-form-grid"><label><span>Tipo de persona</span><select value={personDraft.personType} onChange={event=>setPersonDraft({...personDraft,personType:event.target.value})}><option value="individual">Persona física</option><option value="company">Persona moral</option></select></label><label><span>Preferencia de comunicación</span><select value={personDraft.communicationPreference} onChange={event=>setPersonDraft({...personDraft,communicationPreference:event.target.value})}><option value="email">Correo electrónico</option><option value="whatsapp">WhatsApp</option><option value="phone">Teléfono</option></select></label><label className="properties-form-wide"><span>{personDraft.personType==="company"?"Razón social":"Nombre completo"}</span><input value={personDraft.name} onChange={event=>setPersonDraft({...personDraft,name:event.target.value})}/><FieldError msg={personErrors.name}/></label><label><span>Correo <small>Opcional · para invitarla al portal</small></span><input type="email" value={personDraft.email} onChange={event=>setPersonDraft({...personDraft,email:event.target.value})}/><FieldError msg={personErrors.email}/></label><label><span>Teléfono</span><input value={personDraft.phone} onChange={event=>setPersonDraft({...personDraft,phone:event.target.value})}/></label><fieldset className="properties-form-wide community-role-picker"><legend>Rol general</legend><label><input type="checkbox" checked={isCommittee(personDraft.roles)} onChange={event=>setPersonDraft({...personDraft,roles:event.target.checked?["committee"]:[]})}/><span>Forma parte del comité</span></label></fieldset><label><span>Contacto de emergencia</span><input value={personDraft.emergencyContactName} onChange={event=>setPersonDraft({...personDraft,emergencyContactName:event.target.value})}/></label><label><span>Teléfono de emergencia</span><input value={personDraft.emergencyContactPhone} onChange={event=>setPersonDraft({...personDraft,emergencyContactPhone:event.target.value})}/></label><label className="properties-form-wide"><span>Notas internas</span><textarea value={personDraft.notes} onChange={event=>setPersonDraft({...personDraft,notes:event.target.value})}/></label></div></section></form></Modal>

    <Modal open={Boolean(memberUnitId)} onClose={()=>setMemberUnitId(null)} title={`Agregar persona a ${memberUnit?.identifier||"la unidad"}`} subtitle={`${selectedCommunity?.name||""} · Define quién es y qué puede hacer en esta unidad.`} icon={<HiUserPlus/>} width="max-w-[720px]" footer={<><button type="button" onClick={()=>setMemberUnitId(null)}>Cancelar</button><button type="submit" form="unit-member-form" disabled={savingMember}>{savingMember?"Guardando…":"Agregar a la unidad"}</button></>}>
      <form id="unit-member-form" className="properties-form unit-member-form" onSubmit={saveMember} noValidate>
        <section className="properties-form-section">
          <div className="unit-member-mode" role="radiogroup" aria-label="¿Quién es?">
            <label className={memberDraft.mode==="new"?"active":""}><input type="radio" name="member-mode" checked={memberDraft.mode==="new"} onChange={()=>setMemberDraft({...memberDraft,mode:"new"})}/>Persona nueva</label>
            <label className={memberDraft.mode==="existing"?"active":""}><input type="radio" name="member-mode" checked={memberDraft.mode==="existing"} onChange={()=>setMemberDraft({...memberDraft,mode:"existing"})} disabled={!directoryChoices.length}/>Ya está en el directorio{directoryChoices.length?"":" (vacío)"}</label>
          </div>
          {memberDraft.mode==="new"?<div className="properties-form-grid">
            <label className="properties-form-wide"><span>Nombre completo</span><input id="unit-member-name" value={memberDraft.name} onChange={event=>setMemberDraft({...memberDraft,name:event.target.value})} autoFocus/><FieldError msg={memberErrors.name}/></label>
            <label><span>Correo <small>Opcional · para invitarla al portal</small></span><input id="unit-member-email" type="email" value={memberDraft.email} onChange={event=>setMemberDraft({...memberDraft,email:event.target.value})}/><FieldError msg={memberErrors.email}/></label>
            <label><span>Teléfono <small>Opcional</small></span><input id="unit-member-phone" value={memberDraft.phone} onChange={event=>setMemberDraft({...memberDraft,phone:event.target.value})}/></label>
          </div>:<div className="properties-form-grid"><label className="properties-form-wide"><span>Persona</span><select id="unit-member-person" value={memberDraft.personId} onChange={event=>setMemberDraft({...memberDraft,personId:event.target.value})}><option value="">Elige a la persona</option>{directoryChoices.map(person=><option value={person.id} key={person.id}>{person.name}{person.email?` · ${person.email}`:""}</option>)}</select><FieldError msg={memberErrors.personId}/></label></div>}
        </section>
        <section className="properties-form-section">
          <fieldset className="unit-member-roles"><legend>Relación con {memberUnit?.identifier||"la unidad"}</legend>{Object.entries(PERSON_UNIT_ROLE_LABEL).map(([role,label])=><label key={role} className={memberDraft.role===role?"active":""}><input type="radio" name="member-role" checked={memberDraft.role===role} onChange={()=>setMemberRole(role)}/><strong>{label}</strong><small>{PERSON_UNIT_ROLE_HINT[role]}</small></label>)}</fieldset>
          <FieldError msg={memberErrors.role}/>
          <fieldset className="community-permission-picker"><legend>Qué puede hacer <small>sugerido según la relación</small></legend>{[["isPaymentResponsible","Responsable de pago","Recibe las cuotas de la unidad"],["canVote","Derecho a voto","Participa en las votaciones"],["amenityAccess","Acceso a amenidades","Puede reservar"],["isPrimary","Contacto principal","A quien se busca primero"],...(PROPERTIES_MVP_SCOPE.later?[["accessPermission","Autoriza accesos","Puede dar pases de visita"]]:[])].map(([key,label,hint])=><label key={key}><input type="checkbox" checked={Boolean(memberDraft[key])} disabled={key==="isPaymentResponsible"&&Boolean(currentPayer)} onChange={event=>setMemberDraft({...memberDraft,[key]:event.target.checked})}/><span>{label}<small>{hint}</small></span></label>)}</fieldset>
          {currentPayer?<p className="unit-member-note">{communityPeople.find(person=>person.id===currentPayer.personId)?.name||"Otra persona"} ya es responsable de pago de esta unidad. Solo puede haber uno; para cambiarlo, quítalo primero de la unidad.</p>:null}
          <div className="properties-form-grid"><label><span>Desde <small>Opcional</small></span><input id="unit-member-starts" type="date" value={memberDraft.startsAt} onChange={event=>setMemberDraft({...memberDraft,startsAt:event.target.value})}/></label><label><span>Hasta <small>Vacío si no tiene fin</small></span><input id="unit-member-ends" type="date" value={memberDraft.endsAt} onChange={event=>setMemberDraft({...memberDraft,endsAt:event.target.value})}/><FieldError msg={memberErrors.endsAt}/></label></div>
        </section>
      </form>
    </Modal>
    <Modal open={editingCommunity} onClose={closeEditCommunity} title={`Editar ${selectedCommunity?.name||"comunidad"}`} subtitle="Datos generales y fotos de la comunidad." icon={<HiPencilSquare/>} width="max-w-[760px]" footer={<><button type="button" onClick={closeEditCommunity}>Cancelar</button><button type="submit" form="edit-community-form">Guardar cambios</button></>}>
      <form id="edit-community-form" className="properties-form" onSubmit={saveCommunity} noValidate>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label className="properties-form-wide"><span>Nombre de la comunidad</span><input value={communityDraft.name} onChange={event=>setCommunityDraft({...communityDraft,name:event.target.value})}/><FieldError msg={communityErrors.name}/></label>
          <label><span>Tipo</span><select value={communityDraft.kind} onChange={event=>setCommunityDraft({...communityDraft,kind:event.target.value})}>{Object.entries(COMMUNITY_KIND_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Inmueble asociado</span><input disabled value={selectedProperty?.name||""}/></label>
          <label><span>Cuota base mensual <small>Opcional</small></span><input type="number" min="0" value={communityDraft.cuotaBase} onChange={event=>setCommunityDraft({...communityDraft,cuotaBase:event.target.value})} placeholder="Ej. 1500"/><FieldError msg={communityErrors.cuotaBase}/></label>
          <label><span>Día de cobro <small>1–28</small></span><input type="number" min="1" max="28" value={communityDraft.billingDay} onChange={event=>setCommunityDraft({...communityDraft,billingDay:event.target.value})}/><FieldError msg={communityErrors.billingDay}/></label>
          <label className="properties-form-wide"><span>Enlace al reglamento <small>Opcional</small></span><input type="url" value={communityDraft.reglamentoUrl} onChange={event=>setCommunityDraft({...communityDraft,reglamentoUrl:event.target.value})} placeholder="https://..."/></label>
        </div></section>
        {buildingDraft?<section className="properties-form-section"><header><div><h3>Ficha del edificio</h3><p>Lo que verán residentes e interesados sobre la comunidad.</p></div></header>
          <div className="properties-form-grid">{BUILDING_DIMENSIONS.map(field=><label key={field.key}><span>{field.label}{field.unit?` (${field.unit})`:""} <small>Opcional</small></span><input type="number" min="0" value={buildingDraft.dimensiones[field.key]} onChange={event=>setBuildingDraft(current=>({...current,dimensiones:{...current.dimensiones,[field.key]:event.target.value}}))}/></label>)}</div>
          <fieldset className="community-permission-picker spec-feature-picker"><legend>Amenidades y servicios</legend>{BUILDING_AMENITIES.map(field=><label key={field.key}><input type="checkbox" checked={Boolean(buildingDraft.attributos[field.key])} onChange={event=>setBuildingDraft(current=>({...current,attributos:{...current.attributos,[field.key]:event.target.checked}}))}/><span>{field.label}</span></label>)}</fieldset>
        </section>:selectedCommunity?.inmuebleId?<p className="unit-member-note">No pudimos leer la ficha del edificio; guarda los demás datos y vuelve a intentarlo.</p>:null}
        {selectedCommunity?.inmuebleId?<section className="properties-form-section"><MediaGallery entityType="inmueble" entityId={selectedCommunity.inmuebleId} editable label="Fotos de la comunidad"/></section>:null}
      </form>
    </Modal>

    <Modal open={Boolean(unitEditId&&unitDraft)} onClose={()=>setUnitEditId(null)} title={`Editar ${editedUnit?.identifier||"unidad"}`} subtitle={`${selectedCommunity?.name||""} · Datos y fotos de la unidad.`} icon={<HiHomeModern/>} width="max-w-[760px]" footer={<><button type="button" onClick={()=>setUnitEditId(null)}>Cancelar</button><button type="submit" form="edit-unit-form">Guardar unidad</button></>}>
      {unitDraft?<form id="edit-unit-form" className="properties-form" onSubmit={saveUnit} noValidate>
        <section className="properties-form-section"><div className="properties-form-grid">
          <label><span>Identificador</span><input value={unitDraft.identifier} onChange={event=>updateUnitDraft("identifier",event.target.value)} placeholder="Ej. 101, Casa 4" aria-invalid={Boolean(unitErrors.identifier)}/><FieldError msg={unitErrors.identifier}/></label>
          <label><span>Tipo de unidad</span><select value={unitDraft.type} onChange={event=>updateUnitDraft("type",event.target.value)}>{Object.entries(UNIT_TYPE_LABEL).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Piso o nivel <small>Opcional</small></span><input value={unitDraft.floor} onChange={event=>updateUnitDraft("floor",event.target.value)}/></label>
          <label><span>Estado</span><select value={unitDraft.status} onChange={event=>updateUnitDraft("status",event.target.value)}>{Object.entries(UNIT_STATUS_LABEL).filter(([value])=>value!=="archived"&&(value!=="rented"||PROPERTIES_MVP_SCOPE.rentals||unitDraft.status==="rented")).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Superficie (m²)</span><input type="number" min="0" value={unitDraft.area} onChange={event=>updateUnitDraft("area",event.target.value)} aria-invalid={Boolean(unitErrors.area)}/><FieldError msg={unitErrors.area}/></label>
          <label><span>Recámaras</span><input type="number" min="0" value={unitDraft.bedrooms} onChange={event=>updateUnitDraft("bedrooms",event.target.value)}/></label>
          <label><span>Baños</span><input type="number" min="0" step="0.5" value={unitDraft.bathrooms} onChange={event=>updateUnitDraft("bathrooms",event.target.value)}/></label>
          <label className="properties-form-wide"><span>Descripción <small>Opcional</small></span><textarea rows="3" value={unitDraft.description} onChange={event=>updateUnitDraft("description",event.target.value)}/></label>
        </div></section>
        <section className="properties-form-section"><header><div><h3>Ficha técnica</h3><p>Lo que verán residentes e inquilinos en su portal.</p></div></header>
          <div className="properties-form-grid"><label><span>Estacionamientos <small>Opcional</small></span><input type="number" min="0" value={unitDraft.specs.parking} onChange={event=>updateUnitSpec("parking",event.target.value)}/></label><label><span>Indiviso (%) <small>Opcional</small></span><input type="number" min="0" max="100" step="0.01" value={unitDraft.specs.indiviso_pct} onChange={event=>updateUnitSpec("indiviso_pct",event.target.value)}/></label></div>
          <fieldset className="community-permission-picker spec-feature-picker"><legend>Características</legend>{UNIT_SPEC_FEATURES.map(field=><label key={field.key}><input type="checkbox" checked={Boolean(unitDraft.specs[field.key])} onChange={event=>updateUnitSpec(field.key,event.target.checked)}/><span>{field.label}</span></label>)}</fieldset>
        </section>
        <section className="properties-form-section"><MediaGallery entityType="property" entityId={unitEditId} editable label="Fotos de la unidad"/></section>
      </form>:null}
    </Modal>
  </EcoLayout>;
}

export default CommunityWorkspace;
