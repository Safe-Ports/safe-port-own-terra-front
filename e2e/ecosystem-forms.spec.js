import {test,expect} from '@playwright/test';
import {prepareLands} from './helpers/lands.js';
import {API} from './helpers/session.js';

test.beforeEach(async({page})=>prepareLands(page));
async function noOverflow(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()}

test('Core: proveedor valida, conserva captura tras fallo y guarda una sola vez',async({page})=>{
 let attempts=0,body;
 await page.route(`${API}/providers`,async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{items:[],total:0}});
  attempts++;body=route.request().postDataJSON();
  await route.fulfill({status:attempts===1?503:200,json:attempts===1?{detail:'Temporalmente no disponible'}:{id:'provider-new',...body}});
 });
 await page.goto('/ecosistema/proveedores');await page.getByRole('button',{name:'Nuevo proveedor',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Nuevo proveedor'});
 await dialog.getByRole('button',{name:'Guardar proveedor'}).click();expect(attempts).toBe(0);
 await expect(dialog).toContainText('El nombre o razón social es obligatorio');
 await dialog.getByLabel('Nombre o razón social').fill('Mantenimiento Norte');
 await dialog.getByRole('button',{name:'Guardar proveedor'}).click();await expect(dialog.getByRole('alert')).toBeVisible();
 await expect(dialog.getByLabel('Nombre o razón social')).toHaveValue('Mantenimiento Norte');
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
 expect(await dialog.getByRole('button',{name:'Guardar proveedor'}).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(22, 60, 53)');
 await dialog.getByRole('button',{name:'Guardar proveedor'}).click();await expect(dialog).toHaveCount(0);expect(attempts).toBe(2);expect(body.name).toBe('Mantenimiento Norte');await noOverflow(page);
});

test('Público: fallo de carga permite reintento y fallo de envío conserva respuestas',async({page})=>{
 let allowLoad=false,sends=0,body;
 await page.route(`${API}/public/forms/inscripcion`,async route=>{
  await route.fulfill({status:!allowLoad?503:200,json:!allowLoad?{detail:'No disponible'}:{name:'Inscripción',fields:[{id:'nombre',label:'Nombre completo',required:true}]}});
 });
 await page.route(`${API}/public/forms/inscripcion/submit`,async route=>{
  sends++;body=route.request().postDataJSON();await route.fulfill({status:sends===1?503:200,json:sends===1?{detail:'No disponible'}:{ok:true}});
 });
 await page.goto('/f/inscripcion');await expect(page.getByRole('button',{name:'Reintentar carga'})).toBeVisible();allowLoad=true;await page.getByRole('button',{name:'Reintentar carga'}).click();
 // Sin aceptar el aviso de privacidad no se puede enviar.
 await expect(page.getByRole('button',{name:'Enviar información'})).toBeDisabled();
 await page.getByRole('checkbox',{name:/He leído y acepto el Aviso de Privacidad/}).check();
 await page.getByRole('button',{name:'Enviar información'}).click();expect(sends).toBe(0);
 await expect(page.getByLabel('Nombre completo')).toBeFocused();
 await page.getByLabel('Nombre completo').fill('Laura Pérez');await page.getByRole('button',{name:'Enviar información'}).click();
 await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByLabel('Nombre completo')).toHaveValue('Laura Pérez');
 await page.getByRole('button',{name:'Enviar información'}).click();await expect(page.getByText('¡Información enviada!')).toBeVisible();expect(sends).toBe(2);expect(body).toMatchObject({data:{nombre:'Laura Pérez'},privacy_version:'2.1'});expect(body.terms_accepted_at).toBeTruthy();await noOverflow(page);
});

test('Público: enlace inexistente muestra estado definitivo',async({page})=>{
 await page.route(`${API}/public/forms/inexistente`,route=>route.fulfill({status:404,json:{detail:'No existe'}}));
 await page.goto('/f/inexistente');await expect(page.getByText('Formulario no disponible',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Reintentar carga'})).toHaveCount(0);
});

test('Calculadora: valida sintaxis antes del endpoint y guarda con Enter',async({page})=>{
 let creates=0,body;
 await page.route(`${API}/calculators{,?*}`,async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:[]});
  creates++;body=route.request().postDataJSON();await route.fulfill({json:{id:'nuevo',...body}});
 });
 await page.goto('/calculadora');await page.getByRole('button',{name:'+ Nueva calculadora',exact:true}).click();
 await page.locator('#calculator-name').fill('Plan diario');await page.locator('#calculator-formula').fill('CAPITAL +');
 await page.getByRole('button',{name:'Guardar configuración'}).click();expect(creates).toBe(0);
 await page.locator('#calculator-formula').fill('CAPITAL / MESES');await page.locator('#calculator-name').press('Enter');
 await expect(page.getByText('Calculadora creada',{exact:true})).toBeVisible();expect(creates).toBe(1);expect(body.formula).toBe('CAPITAL / MESES');await noOverflow(page);
});

test('Documentos: buscar contrato fuera de los primeros cien y validar archivo antes de subir',async({page})=>{
 await page.goto('/documentos');await page.getByRole('button',{name:/Subir documento/i}).first().click();
 const dialog=page.getByRole('dialog',{name:'Subir documento'});
 await dialog.getByLabel('Vincular a (opcional)').selectOption('contract');
 await dialog.getByRole('textbox',{name:'Buscar contrato por número'}).fill('CT-130');
 await dialog.getByRole('button').filter({hasText:'CT-130'}).last().click();
 await expect(dialog).toContainText('CT-130');await noOverflow(page);
 await dialog.getByRole('button',{name:'Guardar documento',exact:true}).click();await expect(dialog).toBeVisible();await expect(dialog).toContainText('Selecciona');
});

test('Core: publicar después de un fallo reutiliza el borrador creado',async({page})=>{
 let creates=0,updates=0,publishes=0;
 await page.route(`${API}/forms/templates`,async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:[]});
  creates++;await route.fulfill({json:{id:'draft-1',...route.request().postDataJSON(),is_published:false}});
 });
 await page.route(`${API}/forms/templates/draft-1`,async route=>{updates++;await route.fulfill({json:{id:'draft-1',...route.request().postDataJSON(),is_published:false}})});
 await page.route(`${API}/forms/templates/draft-1/publish`,async route=>{publishes++;await route.fulfill({status:publishes===1?503:200,json:publishes===1?{detail:'Falló publicación'}:{id:'draft-1',is_published:true}})});
 await page.goto('/ecosistema/formularios/nuevo');await page.getByLabel('Nombre del formulario').fill('Ficha diaria');
 await page.getByRole('button',{name:'Guardar y publicar'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:'Guardar y publicar'})).toBeEnabled();expect(creates).toBe(1);
 await page.getByRole('button',{name:'Guardar y publicar'}).click();await expect(page).toHaveURL(/\/ecosistema\/formularios$/);expect(creates).toBe(1);expect(updates).toBe(1);expect(publishes).toBe(2);
});
