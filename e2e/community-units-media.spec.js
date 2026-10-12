import {test,expect} from '@playwright/test';
import {prepare,expectFits} from './helpers/properties.js';
import {API} from './helpers/session.js';
test.beforeEach(async({page})=>prepare(page));

test('comunidad abre unidades y mantiene la ficha seleccionada tras recargar',async({page})=>{
 await page.goto('/properties/comunidades');await page.getByRole('button',{name:'Ver unidades de Comunidad Jacarandas'}).click();
 await expect(page.getByRole('region',{name:'Unidades de Comunidad Jacarandas'})).toBeVisible();
 await page.getByRole('button',{name:'Abrir Departamento 302',exact:true}).click();await expect(page).toHaveURL(/unit=unit/);
 if(page.viewportSize().width<700)await expect.poll(async()=>{const box=await page.locator('#community-unit-detail').boundingBox();return box&&box.y>=0&&box.y<page.viewportSize().height/2;}).toBeTruthy();
 await page.reload();await expect(page.getByRole('complementary',{name:'Detalle de Departamento 302'})).toBeVisible();await expectFits(page);
});

test('crear unidad desde comunidad mantiene el inmueble sin pedirlo otra vez',async({page})=>{
 let created;let unitRows=[{id:'building',inmueble_id:'estate',label:'Comunidad Jacarandas',estado:'ocupado',attributes:{}},{id:'unit',inmueble_id:'estate',parent_id:'building',label:'Departamento 302',estado:'vacante',attributes:{}}];
 await page.route(`${API}/properties{,?*}`,async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{items:unitRows,total:unitRows.length}});
  created=route.request().postDataJSON();const row={id:'new-unit',inmueble_id:'estate',...created};unitRows.push(row);await route.fulfill({status:201,json:row});
 });
 await page.goto('/properties/comunidades');await page.getByRole('button',{name:'Agregar unidad',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Agregar unidad a Comunidad Jacarandas'});
 await dialog.getByLabel('Identificador').fill('Casa 8');await dialog.getByLabel('Tipo de unidad').selectOption('house');await dialog.getByRole('button',{name:'Crear unidad'}).click();
 await expect(dialog).toHaveCount(0);expect(created.parent_id).toBe('building');await expect(page).toHaveURL(/unit=new-unit/);await expect(page.getByRole('complementary',{name:'Detalle de Casa 8'})).toBeVisible();await expectFits(page);
});

test('elegir foto de images_condos guarda en inmueble y sobrevive recarga',async({page})=>{
 let assets=[],uploads=0;await page.route(`${API}/media/inmueble/estate`,async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:assets});uploads++;expect(route.request().postData()).toContain('filename="1625338881.jpg"');assets=[{id:'foto',filename:'1625338881.jpg',entity_type:'inmueble',entity_id:'estate',content_type:'image/jpeg',position:0,url:'/properties/community-images/comunidad-1.jpg'}];await route.fulfill({status:201,json:assets[0]});
 });
 await page.goto('/properties/comunidades');await page.getByRole('button',{name:/Comunidad Jacarandas Condominio/}).click();await page.getByRole('button',{name:'Editar comunidad'}).click();
 const gallery=page.getByRole('region',{name:'Fotos de la comunidad'});await gallery.getByText('Elegir una imagen de images_condos').click();await gallery.getByRole('button',{name:'Agregar 1625338881.jpg a la comunidad'}).click();
 await expect(gallery).toContainText('1 foto en la galería');await expect(gallery.getByRole('img',{name:'1625338881.jpg'})).toBeVisible();expect(uploads).toBe(1);
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();await page.reload();await page.getByRole('button',{name:/Comunidad Jacarandas Condominio/}).click();await expect(page.getByRole('region',{name:'Fotos de Comunidad Jacarandas'}).getByRole('img',{name:'1625338881.jpg'})).toBeVisible();expect(uploads).toBe(1);await expectFits(page);
});

test('error de lectura de archivos se muestra y permite reintentar',async({page})=>{
 let unavailable=true;await page.route(`${API}/media/inmueble/estate`,route=>route.fulfill({status:unavailable?503:200,json:unavailable?{detail:'No disponible'}:[]}));
 await page.goto('/properties/comunidades');await page.getByRole('button',{name:/Comunidad Jacarandas Condominio/}).click();await page.getByRole('button',{name:'Editar comunidad'}).click();
 const gallery=page.getByRole('region',{name:'Fotos de la comunidad'});await expect(gallery.getByRole('alert')).toBeVisible();await expect(gallery.getByRole('button',{name:'Agregar fotos'})).toBeDisabled();unavailable=false;await gallery.getByRole('button',{name:'Reintentar galería'}).click();await expect(gallery.getByRole('alert')).toHaveCount(0);await expect(gallery.getByRole('button',{name:'Agregar fotos'})).toBeEnabled();
});

test('reintentar subida parcial conserva la primera foto sin duplicarla',async({page})=>{
 const rows=[];const attempts={};const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
 await page.route(`${API}/media/inmueble/estate`,async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:rows});
  const name=route.request().postDataBuffer().toString().includes('primera.png')?'primera.png':'segunda.png';attempts[name]=(attempts[name]||0)+1;
  if(name==='segunda.png'&&attempts[name]===1)return route.fulfill({status:503,json:{detail:'Fallo temporal de almacenamiento'}});
  const asset={id:name,filename:name,content_type:'image/png',url:pixel,position:rows.length};rows.push(asset);return route.fulfill({json:asset});
 });
 await page.goto('/properties/comunidades');await page.getByRole('button',{name:/Comunidad Jacarandas Condominio/}).click();await page.getByRole('button',{name:'Editar comunidad'}).click();
 const gallery=page.getByRole('region',{name:'Fotos de la comunidad'});await expect(gallery.getByRole('button',{name:'Agregar fotos'})).toBeEnabled();
 const buffer=Buffer.from(pixel.split(',')[1],'base64');await gallery.getByTestId('media-gallery-input').setInputFiles([{name:'primera.png',mimeType:'image/png',buffer},{name:'segunda.png',mimeType:'image/png',buffer}]);
 await expect(gallery.getByRole('alert')).toBeVisible();await expect(gallery.getByText('1 foto en la galería',{exact:true})).toBeVisible();await gallery.getByRole('button',{name:'Reintentar archivos pendientes'}).click();
 await expect(gallery.getByText('2 fotos en la galería',{exact:true})).toBeVisible();expect(attempts).toEqual({'primera.png':1,'segunda.png':2});await expect(gallery.getByRole('alert')).toHaveCount(0);
});

test('vincular contacto existente como inquilino guarda y sobrevive recarga',async({page})=>{
 const relations=[];let created;
 await page.route(`${API}/roles`,route=>route.fulfill({json:[{id:'owner-role',clave:'owner'},{id:'tenant-role',clave:'tenant'}]}));
 await page.route(`${API}/property-relations{,?*}`,async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:relations});
  created=route.request().postDataJSON();const row={id:'qa-relation',...created};relations.push(row);return route.fulfill({status:201,json:row});
 });
 await page.goto('/properties/comunidades');await page.getByRole('button',{name:'Abrir Departamento 302',exact:true}).click();await page.getByRole('button',{name:'Agregar la primera persona'}).click();
 const dialog=page.getByRole('dialog',{name:'Agregar persona a Departamento 302'});
 await dialog.getByText('Ya está en el directorio',{exact:true}).click();await dialog.getByRole('combobox',{name:'Persona',exact:true}).selectOption('person');await dialog.getByText('Inquilino',{exact:true}).click();
 await dialog.getByRole('button',{name:'Agregar a la unidad'}).click();await expect(dialog).toHaveCount(0);
 expect(created).toMatchObject({property_id:'unit',persona_id:'person',role_id:'tenant-role',can_vote:false,is_payment_responsible:false,start_date:null,end_date:null});
 await expect(page.getByRole('region',{name:'Personas de Departamento 302'})).toContainText('Mariana Torres');await page.reload();await expect(page.getByRole('region',{name:'Personas de Departamento 302'})).toContainText('Mariana Torres');
});
