import {test,expect} from '@playwright/test';
import {API} from './helpers/session.js';

async function portal(page,{units=[{id:'unit',label:'QA Unidad',attributes:{area:46}}],voteStatus=201,readStatus=200,role="tenant"}={}){
 const requests=[];let read=false;
 await page.addInitScript(()=>{if(!sessionStorage.getItem('qa-portal-seeded')){localStorage.setItem('ownterra_properties_portal_token','qa-synthetic-token');sessionStorage.setItem('qa-portal-seeded','1')}});
 await page.route(`${API}/**`,async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace(/^.*\/api\/v1/,'');
  requests.push({path,method:request.method(),body:request.postDataJSON()});
  if(path==='/portal/announcements/notice/read'){const status=typeof readStatus==='function'?readStatus():readStatus;if(status===200)read=true;return route.fulfill({status,json:status===200?{}:{error:{message:'QA fallo lectura'}}});}
  if(path==='/portal/votes/vote/ballot')return route.fulfill({status:voteStatus,json:voteStatus===201?{id:'ballot'}:{error:{message:'QA voto rechazado'}}});
  const responses={
   '/portal/auth/me':{portal_identity_id:'identity',organization_id:'org1',email:'qa@example.com',status:'active'},'/portal/me':{nombre:'QA Usuario',organization_id:'org1'},'/portal/units':units,
   '/portal/relations':units.map(unit=>({property_id:unit.id,roles:[role],flags:{can_vote:false}})),
   '/portal/statement':{total_due:60,open_charges:[{id:'charge',concept:'QA cuota',amount:100,paid_amount:40,currency:'MXN',due_date:'2026-10-31',status:'partial'}]},
   '/portal/announcements':[{id:'notice',title:'QA Aviso',body:'Aviso de prueba',read_at:read?'2026-10-11T12:00:00Z':null}],
   '/portal/votes':[{id:'vote',question:'QA pregunta',status:'open',options:[{id:'yes',label:'Sí'},{id:'no',label:'No'}]}],
   '/portal/packages':[{id:'package',carrier:'QA Mensajería',tracking_number:'QA-001',received_at:'2026-10-11T12:00:00Z',status:'pending'}],
  };
  return route.fulfill({status:path in responses?200:404,json:responses[path]||{error:{message:'Ruta no simulada'}}});
 });
 return requests;
}

for(const role of ['owner','resident','tenant'])test(`portal ${role}: las 24 unidades autorizadas y navegación operativa`,async({page})=>{
 // La autorización se certifica en API SQLite; aquí sólo se comprueba la vista del contrato filtrado.
 const units=Array.from({length:24},(_,i)=>({id:`unit-${i}`,label:`QA ${role} Unidad ${i+1}`,attributes:{area:46}}));
 const requests=await portal(page,{units,role});await page.goto('/portal-comunidad');
 await expect(page.getByText('24 unidades visibles según tus relaciones y permisos.')).toBeVisible();
 await page.getByRole('button',{name:'Mi unidad',exact:true}).click();
 for(const unit of units)await expect(page.getByRole('heading',{name:unit.label,exact:true,level:3})).toBeVisible();
 await page.getByRole('button',{name:'Estado de cuenta',exact:true}).click();await expect(page.getByText('QA cuota')).toBeVisible();await expect(page.locator('.community-list b')).toHaveText('$60.00');
 await page.getByRole('button',{name:/Comunicados/}).click();await page.getByRole('button',{name:'Marcar leído'}).click();await expect(page.getByText('Leído',{exact:true})).toBeVisible();
 expect(requests.find(r=>r.path==='/portal/announcements/notice/read')).toMatchObject({method:'POST',body:null});
 await page.getByRole('button',{name:'Paquetería',exact:true}).click();await expect(page.getByText('QA Mensajería')).toBeVisible();
 await page.reload();await expect(page.getByText('24 unidades visibles según tus relaciones y permisos.')).toBeVisible();
});

for(const status of [201,409,503])test(`portal voto: respuesta ${status} visible y body sin identidad arbitraria`,async({page})=>{
 const requests=await portal(page,{voteStatus:status});await page.goto('/portal-comunidad');await page.getByRole('button',{name:'Votaciones',exact:true}).click();await page.getByRole('button',{name:'Sí',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText(status===201?'Tu voto quedó registrado.':'QA voto rechazado');
 expect(requests.find(r=>r.path==='/portal/votes/vote/ballot')).toMatchObject({method:'POST',body:{option_id:'yes'}});
});

test('portal no permite abrir unidades sin sesión propia',async({page})=>{
 await page.goto('/portal-comunidad');await expect(page).toHaveURL(/portal\/acceso/);
});


test('comunicado: fallo visible, datos conservados y reintento exitoso',async({page})=>{
 let status=503;await portal(page,{readStatus:()=>status});await page.goto('/portal-comunidad');
 await page.getByRole('button',{name:'Ver comunicados',exact:true}).click();await page.getByRole('button',{name:'Marcar leído'}).click();
 await expect(page.getByRole('alert')).toHaveText('QA fallo lectura');await expect(page.getByText('QA Aviso')).toBeVisible();
 status=200;await page.getByRole('button',{name:'Marcar leído'}).click();await expect(page.getByText('Leído',{exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});

test('voto temporalmente fallido permite reintentar y no repetir éxito',async({page})=>{
 await portal(page,{voteStatus:503});await page.goto('/portal-comunidad');await page.getByRole('button',{name:'Votaciones',exact:true}).click();await page.getByRole('button',{name:'Sí',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('QA voto rechazado');await expect(page.getByRole('button',{name:'Sí',exact:true})).toBeEnabled();
 await page.route(`${API}/portal/votes/vote/ballot`,route=>route.fulfill({status:201,json:{id:'ballot'}}));await page.getByRole('button',{name:'Sí',exact:true}).click();
 await expect(page.getByRole('status')).toHaveText('Tu voto quedó registrado.');await expect(page.getByRole('button',{name:'Sí',exact:true})).toHaveCount(0);
});

test('cerrar sesión del portal retorna al acceso y protege la ruta',async({page})=>{
 await portal(page);await page.goto('/portal-comunidad');await page.getByRole('button',{name:'Cerrar sesión del portal'}).click();await expect(page).toHaveURL(/portal\/acceso/);
 await page.goto('/portal-comunidad');await expect(page).toHaveURL(/portal\/acceso/);
});

for(const width of [360,430])test(`portal autenticado a ${width}px: navegación y ficha utilizables`,async({page})=>{
 await page.setViewportSize({width,height:844});await portal(page);await page.goto('/portal-comunidad');await page.getByRole('button',{name:'Mi unidad',exact:true}).click();
 await expect(page.getByRole('heading',{name:'QA Unidad',level:3})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Estado de cuenta',exact:true}).click();await expect(page.getByText('QA cuota')).toBeVisible();
});
