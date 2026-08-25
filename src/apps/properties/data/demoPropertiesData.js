// Escenario editorial para evaluar el flujo visual de Properties.
export const demoOwners = [
  {id:"own-ana",name:"Ana Lucía Mendoza",personType:"individual",email:"ana.mendoza@demo.mx",phone:"55 4102 8890",notes:"Prefiere reportes mensuales por correo.",status:"active",propertiesCount:2},
  {id:"own-camino",name:"Patrimonial Camino Verde, S.A.",personType:"company",email:"operacion@caminoverde.demo",phone:"55 7811 2234",notes:"Contacto operativo: Rodrigo Suárez.",status:"active",propertiesCount:2},
  {id:"own-elena",name:"Elena Villarreal",personType:"individual",email:"elena.villarreal@demo.mx",phone:"81 2055 7710",notes:"Autoriza mantenimientos menores hasta $5,000.",status:"active",propertiesCount:1},
  {id:"own-norte",name:"Inversiones Norte Claro",personType:"company",email:"activos@norteclaro.demo",phone:"81 9008 1102",notes:"Requiere evidencia fotográfica en cada ticket.",status:"active",propertiesCount:1},
  {id:"own-javier",name:"Javier Ortega Salas",personType:"individual",email:"javier.ortega@demo.mx",phone:"33 1804 9250",notes:"Contacto por WhatsApp durante horario laboral.",status:"active",propertiesCount:1},
];

export const demoProperties = [
  {id:"prop-jacarandas",name:"Torre Jacarandas",ownerId:"own-camino",type:"apartment_building",address:"Av. Jacarandas 184",city:"Ciudad de México",state:"CDMX",description:"Edificio residencial de seis niveles con elevador y roof garden.",status:"active",unitsCount:6,occupiedUnits:4},
  {id:"prop-olivo",name:"Casa Olivo",ownerId:"own-ana",type:"house",address:"Paseo del Olivo 42",city:"Valle de Bravo",state:"Estado de México",description:"Casa amueblada con jardín y acceso controlado.",status:"active",unitsCount:1,occupiedUnits:1},
  {id:"prop-plaza",name:"Plaza Norte",ownerId:"own-norte",type:"commercial",address:"Av. Universidad 910",city:"Monterrey",state:"Nuevo León",description:"Plaza de servicios de barrio con estacionamiento frontal.",status:"active",unitsCount:5,occupiedUnits:3},
  {id:"prop-bosque",name:"Refugio Bosque Alto",ownerId:"own-elena",type:"mixed",address:"Camino al Mirador km 3.5",city:"Tapalpa",state:"Jalisco",description:"Conjunto de cabañas para estancia media y larga.",status:"active",unitsCount:4,occupiedUnits:2},
  {id:"prop-centro",name:"Oficinas Centro 27",ownerId:"own-camino",type:"office",address:"República de Uruguay 27",city:"Ciudad de México",state:"CDMX",description:"Piso de oficinas flexibles en edificio histórico rehabilitado.",status:"active",unitsCount:4,occupiedUnits:3},
  {id:"prop-arboleda",name:"Residencial La Arboleda",ownerId:"own-javier",type:"apartment_building",address:"Av. Patria 1450",city:"Zapopan",state:"Jalisco",description:"Departamentos familiares con áreas verdes y vigilancia.",status:"active",unitsCount:4,occupiedUnits:3},
];

export const demoUnits = [
  {id:"unit-j101",propertyId:"prop-jacarandas",ownerId:"",identifier:"Departamento 101",type:"apartment",floor:"1",area:82,bedrooms:2,bathrooms:2,suggestedRent:18500,status:"rented",description:"Balcón interior y un cajón."},
  {id:"unit-j201",propertyId:"prop-jacarandas",ownerId:"",identifier:"Departamento 201",type:"apartment",floor:"2",area:82,bedrooms:2,bathrooms:2,suggestedRent:19000,status:"rented",description:"Vista arbolada."},
  {id:"unit-j302",propertyId:"prop-jacarandas",ownerId:"",identifier:"Departamento 302",type:"apartment",floor:"3",area:96,bedrooms:3,bathrooms:2,suggestedRent:22500,status:"maintenance",description:"Terraza y dos cajones."},
  {id:"unit-j401",propertyId:"prop-jacarandas",ownerId:"",identifier:"Departamento 401",type:"apartment",floor:"4",area:82,bedrooms:2,bathrooms:2,suggestedRent:20500,status:"available",description:"Disponible para entrega inmediata."},
  {id:"unit-j501",propertyId:"prop-jacarandas",ownerId:"",identifier:"Penthouse 501",type:"penthouse",floor:"5",area:145,bedrooms:3,bathrooms:3,suggestedRent:34000,status:"rented",description:"Roof privado."},
  {id:"unit-jp1",propertyId:"prop-jacarandas",ownerId:"",identifier:"Estacionamiento P-12",type:"parking",floor:"S1",area:13,bedrooms:0,bathrooms:0,suggestedRent:1800,status:"available",description:"Cajón independiente."},
  {id:"unit-olivo",propertyId:"prop-olivo",ownerId:"",identifier:"Casa principal",type:"house",floor:"",area:210,bedrooms:4,bathrooms:3.5,suggestedRent:39000,status:"rented",description:"Jardín, chimenea y estudio."},
  {id:"unit-p1",propertyId:"prop-plaza",ownerId:"",identifier:"Local 1 · Café",type:"commercial_unit",floor:"PB",area:58,bedrooms:0,bathrooms:1,suggestedRent:16800,status:"rented",description:"Frente a acceso principal."},
  {id:"unit-p2",propertyId:"prop-plaza",ownerId:"",identifier:"Local 2 · Servicios",type:"commercial_unit",floor:"PB",area:44,bedrooms:0,bathrooms:1,suggestedRent:13200,status:"available",description:"Instalación eléctrica trifásica."},
  {id:"unit-p3",propertyId:"prop-plaza",ownerId:"",identifier:"Local 3 · Farmacia",type:"commercial_unit",floor:"PB",area:91,bedrooms:0,bathrooms:1,suggestedRent:24500,status:"rented",description:"Local ancla."},
  {id:"unit-p4",propertyId:"prop-plaza",ownerId:"",identifier:"Local 4 · Estudio",type:"commercial_unit",floor:"1",area:67,bedrooms:0,bathrooms:1,suggestedRent:14900,status:"maintenance",description:"Adecuación de plafón."},
  {id:"unit-p5",propertyId:"prop-plaza",ownerId:"",identifier:"Bodega B-02",type:"warehouse",floor:"S1",area:24,bedrooms:0,bathrooms:0,suggestedRent:3800,status:"rented",description:"Acceso por área de carga."},
  {id:"unit-brisa",propertyId:"prop-bosque",ownerId:"",identifier:"Cabaña Brisa",type:"cabin",floor:"",area:54,bedrooms:1,bathrooms:1,suggestedRent:12500,status:"rented",description:"Terraza hacia el bosque."},
  {id:"unit-roble",propertyId:"prop-bosque",ownerId:"",identifier:"Cabaña Roble",type:"cabin",floor:"",area:72,bedrooms:2,bathrooms:1,suggestedRent:15800,status:"maintenance",description:"Revisión preventiva de cubierta."},
  {id:"unit-niebla",propertyId:"prop-bosque",ownerId:"",identifier:"Cabaña Niebla",type:"cabin",floor:"",area:68,bedrooms:2,bathrooms:2,suggestedRent:17200,status:"available",description:"Chimenea y tapanco."},
  {id:"unit-pino",propertyId:"prop-bosque",ownerId:"",identifier:"Cabaña Pino",type:"cabin",floor:"",area:88,bedrooms:3,bathrooms:2,suggestedRent:21000,status:"rented",description:"Ideal para familias."},
  {id:"unit-o1",propertyId:"prop-centro",ownerId:"",identifier:"Oficina 3A",type:"office",floor:"3",area:34,bedrooms:0,bathrooms:0,suggestedRent:9800,status:"rented",description:"Para 4 estaciones."},
  {id:"unit-o2",propertyId:"prop-centro",ownerId:"",identifier:"Oficina 3B",type:"office",floor:"3",area:46,bedrooms:0,bathrooms:0,suggestedRent:12600,status:"rented",description:"Sala privada incluida."},
  {id:"unit-o3",propertyId:"prop-centro",ownerId:"",identifier:"Oficina 3C",type:"office",floor:"3",area:28,bedrooms:0,bathrooms:0,suggestedRent:8200,status:"available",description:"Vista a patio central."},
  {id:"unit-o4",propertyId:"prop-centro",ownerId:"",identifier:"Suite de juntas",type:"office",floor:"3",area:52,bedrooms:0,bathrooms:0,suggestedRent:14500,status:"rented",description:"Sala para 12 personas."},
  {id:"unit-a1",propertyId:"prop-arboleda",ownerId:"",identifier:"A-102",type:"apartment",floor:"1",area:105,bedrooms:3,bathrooms:2,suggestedRent:21800,status:"rented",description:"Jardín privado."},
  {id:"unit-a2",propertyId:"prop-arboleda",ownerId:"",identifier:"A-204",type:"apartment",floor:"2",area:92,bedrooms:2,bathrooms:2,suggestedRent:19400,status:"rented",description:"Vista al parque."},
  {id:"unit-a3",propertyId:"prop-arboleda",ownerId:"",identifier:"B-301",type:"apartment",floor:"3",area:118,bedrooms:3,bathrooms:2.5,suggestedRent:23900,status:"available",description:"Unidad esquina."},
  {id:"unit-a4",propertyId:"prop-arboleda",ownerId:"",identifier:"B-402",type:"apartment",floor:"4",area:105,bedrooms:3,bathrooms:2,suggestedRent:22500,status:"rented",description:"Balcón panorámico."},
];

export const demoTickets = [
  {id:"tk-1",folio:"OT-240381",title:"Fuga debajo del lavabo",description:"Goteo constante en baño principal; cerrar llave antes de ingresar.",propertyId:"prop-jacarandas",unitId:"unit-j302",type:"maintenance",priority:"urgent",status:"in_progress",assignee:"Plomería Díaz",createdAt:"2026-08-18T09:20:00Z",updatedAt:"2026-08-18T12:10:00Z"},
  {id:"tk-2",folio:"OT-240366",title:"Revisión de cubierta",description:"Humedad visible junto a la chimenea después de lluvia.",propertyId:"prop-bosque",unitId:"unit-roble",type:"inspection",priority:"high",status:"open",assignee:"Construcciones Tapalpa",createdAt:"2026-08-17T16:30:00Z",updatedAt:"2026-08-17T16:30:00Z"},
  {id:"tk-3",folio:"OT-240352",title:"Cambio de luminarias",description:"Dos luminarias del pasillo norte no encienden.",propertyId:"prop-plaza",unitId:"",type:"maintenance",priority:"medium",status:"waiting",assignee:"Equipo interno",createdAt:"2026-08-16T11:00:00Z",updatedAt:"2026-08-18T08:15:00Z"},
  {id:"tk-4",folio:"OT-240349",title:"Plafón con humedad",description:"Revisar origen antes de cerrar la adecuación del local.",propertyId:"prop-plaza",unitId:"unit-p4",type:"maintenance",priority:"high",status:"in_progress",assignee:"Obra Ligera MTY",createdAt:"2026-08-16T09:40:00Z",updatedAt:"2026-08-18T10:20:00Z"},
  {id:"tk-5",folio:"OT-240330",title:"Limpieza para nueva visita",description:"Preparar la unidad y verificar inventario fotográfico.",propertyId:"prop-jacarandas",unitId:"unit-j401",type:"cleaning",priority:"medium",status:"open",assignee:"Limpio Hogar",createdAt:"2026-08-14T14:10:00Z",updatedAt:"2026-08-14T14:10:00Z"},
  {id:"tk-6",folio:"OT-240319",title:"Acceso de proveedor",description:"Autorizar ingreso para mantenimiento preventivo del elevador.",propertyId:"prop-jacarandas",unitId:"",type:"security",priority:"low",status:"waiting",assignee:"Caseta Jacarandas",createdAt:"2026-08-13T08:50:00Z",updatedAt:"2026-08-17T15:00:00Z"},
  {id:"tk-7",folio:"OT-240301",title:"Verificar minisplit",description:"El equipo enfría lentamente durante la tarde.",propertyId:"prop-centro",unitId:"unit-o2",type:"maintenance",priority:"medium",status:"open",assignee:"Climas del Centro",createdAt:"2026-08-11T13:25:00Z",updatedAt:"2026-08-11T13:25:00Z"},
  {id:"tk-8",folio:"OT-240287",title:"Lectura de medidores",description:"Registrar evidencia de agua y electricidad al cierre del mes.",propertyId:"prop-arboleda",unitId:"",type:"administration",priority:"low",status:"open",assignee:"Mariana Soto",createdAt:"2026-08-09T10:00:00Z",updatedAt:"2026-08-09T10:00:00Z"},
  {id:"tk-9",folio:"OT-240270",title:"Ajuste de puerta principal",description:"La cerradura roza y requiere alineación.",propertyId:"prop-olivo",unitId:"unit-olivo",type:"maintenance",priority:"medium",status:"resolved",assignee:"Cerrajería Avándaro",createdAt:"2026-08-06T12:30:00Z",updatedAt:"2026-08-08T17:45:00Z"},
  {id:"tk-10",folio:"OT-240248",title:"Inspección de salida",description:"Checklist, fotografías y lectura final de servicios.",propertyId:"prop-jacarandas",unitId:"unit-j401",type:"inspection",priority:"medium",status:"resolved",assignee:"Ana Castillo",createdAt:"2026-08-02T09:10:00Z",updatedAt:"2026-08-03T16:20:00Z"},
];

export const demoCommunities = [
  {id:"community-jacarandas",propertyId:"prop-jacarandas",name:"Comunidad Torre Jacarandas",kind:"condominium",regime:"Régimen de propiedad en condominio",administrator:"Own Terra Administración",contactEmail:"administracion@jacarandas.demo",contactPhone:"55 4100 2211",operationFrequency:"monthly",timezone:"America/Mexico_City",currency:"MXN",status:"active"},
  {id:"community-arboleda",propertyId:"prop-arboleda",name:"Privada La Arboleda",kind:"private_community",regime:"Asociación de residentes",administrator:"Administración La Arboleda",contactEmail:"contacto@arboleda.demo",contactPhone:"33 4100 8820",operationFrequency:"monthly",timezone:"America/Mexico_City",currency:"MXN",status:"active"},
];

export const demoCommunityPeople = [
  {id:"person-mariana",communityIds:["community-jacarandas"],personType:"individual",name:"Mariana Torres",email:"mariana.torres@demo.mx",phone:"55 3102 4431",roles:["owner","resident","committee"],emergencyContactName:"Laura Torres",emergencyContactPhone:"55 3102 4499",communicationPreference:"whatsapp",notes:"Titular y residente principal.",status:"active"},
  {id:"person-carlos",communityIds:["community-jacarandas"],personType:"individual",name:"Carlos Vega",email:"carlos.vega@demo.mx",phone:"55 4401 1990",roles:["tenant","resident"],emergencyContactName:"",emergencyContactPhone:"",communicationPreference:"email",notes:"Inquilino con acceso autorizado.",status:"active"},
  {id:"person-ana",communityIds:["community-jacarandas"],personType:"individual",name:"Ana Lucía Mendoza",email:"ana.mendoza@demo.mx",phone:"55 4102 8890",roles:["owner","payment_responsible"],emergencyContactName:"",emergencyContactPhone:"",communicationPreference:"email",notes:"Propietaria no residente.",status:"active"},
  {id:"person-sofia",communityIds:["community-jacarandas"],personType:"individual",name:"Sofía Herrera",email:"sofia.herrera@demo.mx",phone:"55 9920 1844",roles:["tenant","resident"],emergencyContactName:"",emergencyContactPhone:"",communicationPreference:"whatsapp",notes:"Residente principal.",status:"active"},
  {id:"person-javier",communityIds:["community-arboleda"],personType:"individual",name:"Javier Ortega Salas",email:"javier.ortega@demo.mx",phone:"33 1804 9250",roles:["owner","resident","committee"],emergencyContactName:"",emergencyContactPhone:"",communicationPreference:"whatsapp",notes:"Miembro de la comunidad La Arboleda.",status:"active"},
];

export const demoPersonUnitRelations = [
  {id:"rel-1",communityId:"community-jacarandas",personId:"person-mariana",unitId:"unit-j201",role:"owner",isPrimary:true,isPaymentResponsible:true,canVote:true,amenityAccess:true,accessPermission:true,startsAt:"2024-01-10",endsAt:"",status:"active"},
  {id:"rel-2",communityId:"community-jacarandas",personId:"person-mariana",unitId:"unit-j201",role:"resident",isPrimary:true,startsAt:"2024-01-10",endsAt:"",status:"active"},
  {id:"rel-3",communityId:"community-jacarandas",personId:"person-carlos",unitId:"unit-j101",role:"tenant",isPrimary:true,startsAt:"2026-02-01",endsAt:"2027-01-31",status:"active"},
  {id:"rel-4",communityId:"community-jacarandas",personId:"person-carlos",unitId:"unit-j101",role:"resident",isPrimary:true,startsAt:"2026-02-01",endsAt:"2027-01-31",status:"active"},
  {id:"rel-5",communityId:"community-jacarandas",personId:"person-ana",unitId:"unit-j401",role:"owner",isPrimary:true,startsAt:"2023-08-15",endsAt:"",status:"active"},
  {id:"rel-6",communityId:"community-jacarandas",personId:"person-sofia",unitId:"unit-j401",role:"tenant",isPrimary:true,startsAt:"2025-12-01",endsAt:"2026-11-30",status:"active"},
  {id:"rel-7",communityId:"community-jacarandas",personId:"person-sofia",unitId:"unit-j401",role:"resident",isPrimary:true,startsAt:"2025-12-01",endsAt:"2026-11-30",status:"active"},
  {id:"rel-8",communityId:"community-arboleda",personId:"person-javier",unitId:"unit-a1",role:"owner",isPrimary:true,startsAt:"2022-04-20",endsAt:"",status:"active"},
  {id:"rel-9",communityId:"community-arboleda",personId:"person-javier",unitId:"unit-a1",role:"resident",isPrimary:true,startsAt:"2022-04-20",endsAt:"",status:"active"},
];

export const demoCondoCharges = [
  {id:"charge-1",communityId:"community-jacarandas",unitId:"unit-j101",concept:"Cuota ordinaria · agosto",amount:1850,dueDate:"2026-08-10",status:"overdue",createdAt:"2026-08-01"},
  {id:"charge-2",communityId:"community-jacarandas",unitId:"unit-j201",concept:"Cuota ordinaria · agosto",amount:1850,dueDate:"2026-08-10",status:"paid",createdAt:"2026-08-01"},
  {id:"charge-3",communityId:"community-jacarandas",unitId:"unit-j401",concept:"Fondo extraordinario impermeabilización",amount:3200,dueDate:"2026-08-30",status:"pending",createdAt:"2026-08-12"},
];
export const demoAnnouncements = [{id:"announcement-1",communityId:"community-jacarandas",title:"Mantenimiento preventivo del elevador",body:"El elevador estará fuera de servicio el jueves de 10:00 a 13:00.",audience:"all",publishedAt:"2026-08-22T10:00:00Z",readCount:18,status:"published"}];
export const demoAmenities = [{id:"amenity-roof",communityId:"community-jacarandas",name:"Roof garden",capacity:24,status:"available"},{id:"amenity-salon",communityId:"community-jacarandas",name:"Salón de usos múltiples",capacity:40,status:"available"}];
export const demoReservations = [{id:"reservation-1",communityId:"community-jacarandas",amenityId:"amenity-roof",personName:"Mariana Torres",date:"2026-08-29",time:"18:00",status:"confirmed"}];
export const demoVotes = [{id:"vote-1",communityId:"community-jacarandas",title:"Renovación de pintura en lobby",description:"Aprobación del presupuesto presentado por el comité.",closesAt:"2026-08-31",yes:14,no:3,abstain:2,status:"open"}];
