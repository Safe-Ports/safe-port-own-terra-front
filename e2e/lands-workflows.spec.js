import {test,expect} from '@playwright/test';
import {prepareLands} from './helpers/lands.js';
import {API} from './helpers/session.js';

test.beforeEach(async({page})=>prepareLands(page));

test('buscar cliente por teléfono fuera de la primera tanda cambia ficha y sobrevive recarga',async({page})=>{
 await page.goto('/clientes');
 await page.getByRole('button',{name:'Ver cliente Cliente 001',exact:true}).click();
 await page.getByRole('searchbox',{name:'Buscar clientes'}).fill('5500000130');
 await page.getByRole('button',{name:'Ver cliente Cliente 130',exact:true}).waitFor();
 await expect(page.locator('.cl-det-nm')).toHaveText('Cliente 130');
 await page.getByRole('button',{name:'Ver cliente Cliente 130',exact:true}).click();await page.reload();
 await expect(page.locator('.cl-det-nm')).toHaveText('Cliente 130');
 await page.getByRole('searchbox',{name:'Buscar clientes'}).fill('no-existe');
 await expect(page.locator('.cl-det-nm')).toHaveCount(0);
});

test('contratos consulta todas las páginas y abre resultado directo',async({page})=>{
 await page.goto('/contratos');await page.getByRole('searchbox',{name:'Buscar contrato por número'}).fill('CT-130');
 await expect(page.locator('.tbl tbody')).toContainText('CT-130');
 await expect(page.locator('.tbl tbody')).not.toContainText('CT-001');
 await page.goto('/contratos?contract=ct130');
 await expect(page.getByRole('region',{name:'Contrato encontrado'})).toContainText('Cliente 130');
 await page.getByRole('button',{name:'Abrir contrato',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Editar Contrato'})).toBeVisible();
});

test('contrato nuevo exige elegir cliente y muestra mensualidad del plan',async({page})=>{
 await page.goto('/contratos');await page.getByRole('button',{name:'+ Generar Contrato',exact:true}).click();
 await expect(page.locator('#cf-clientId')).toHaveValue('');
 await page.locator('#cf-clientId').fill('Cliente 130');
 await page.getByRole('button').filter({hasText:'Cliente 130'}).last().click();
 await expect(page.locator('#cf-clientId')).toHaveValue('Cliente 130');
 await page.locator('#cf-amount').fill('120000');await page.locator('#cf-down_payment').fill('20000');await page.locator('#cf-totalM').fill('10');
 await expect(page.locator('.lands-contract-summary')).toContainText('11,200');
 await expect(page.getByText('Cuota mensual estimada',{exact:true})).toHaveCount(0);
});

test('cobro en efectivo envía método correcto y recupera comprobante sin duplicar pago',async({page})=>{
 let paid=0,uploads=0,body;
 await page.route(`${API}/payments/p1/mark-paid`,async route=>{paid++;body=route.request().postDataJSON();await route.fulfill({json:{id:'p1'}})});
 await page.route(`${API}/payments/p1/upload-receipt`,async route=>{uploads++;await route.fulfill({status:uploads===1?500:200,json:uploads===1?{detail:'Error de archivo'}:{id:'p1'}})});
 await page.goto('/pagos');await page.getByRole('button',{name:'Registrar pago',exact:true}).first().click();
 const dialog=page.getByRole('dialog',{name:'Registrar cobro'});await dialog.getByRole('textbox',{name:'Buscar cliente por nombre, correo o teléfono'}).fill('Cliente 130');
 await dialog.getByRole('button').filter({hasText:'Cliente 130'}).last().click();
 await dialog.locator('select').filter({has:page.locator('option[value="ct130"]')}).selectOption('ct130');
  await dialog.locator('select').filter({has:page.locator('option[value="p1"]')}).selectOption('p1');
  await expect(dialog.locator('option[value="p1"]')).toContainText('10 oct 2026');
 await dialog.getByLabel('Método de pago').selectOption('cash');
 await dialog.locator('input[type="file"]').setInputFiles({name:'recibo.pdf',mimeType:'application/pdf',buffer:Buffer.from('receipt')});
 await dialog.getByRole('button',{name:'Registrar cobro',exact:true}).click();
 await expect(page.getByText('Cobro registrado. Comprobante pendiente.',{exact:true})).toBeVisible();
 expect(body.payment_method).toBe('cash');expect(paid).toBe(1);await page.reload();await expect(page.locator('.lands-receipt-pending')).toBeVisible();
 await page.locator('.lands-receipt-pending input[type="file"]').setInputFiles({name:'recibo.pdf',mimeType:'application/pdf',buffer:Buffer.from('receipt')});
 await page.getByRole('button',{name:'Adjuntar comprobante',exact:true}).click();
 await expect(page.locator('.lands-receipt-pending')).toHaveCount(0);expect(paid).toBe(1);expect(uploads).toBe(2);
});

test('cotizador usa plan activo y lote directo conserva proyecto',async({page})=>{
 await page.goto('/fraccionamientos?lot=l2');
 await expect(page.getByRole('complementary',{name:'Detalle del lote N-2'})).toBeVisible();
 await page.getByRole('button',{name:'Cerrar',exact:true}).last().click();
 await page.locator('.frac-quote-head').click();
 await page.getByRole('button',{name:'Abrir cotizador completo'}).click();
 const dialog=page.getByRole('dialog',{name:'Cotizador'});
 await dialog.getByLabel('Precio financiado').fill('120000');await dialog.getByLabel('Enganche',{exact:true}).fill('20000');await dialog.getByLabel('Plazo (meses)').fill('10');
 await expect(dialog.locator('.frac-quote-result')).toContainText('11,200');
});

test('móvil: captura y búsqueda caben en la pantalla',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/clientes');await page.getByRole('button',{name:'+ Agregar cliente',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Agregar cliente'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('dialog',{name:'Agregar cliente'}).getByRole('button',{name:'Cancelar',exact:true}).click();
 await page.goto('/contratos');await page.getByRole('button',{name:'+ Generar Contrato',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Generar Contrato'});
 expect(await dialog.boundingBox()).toMatchObject({width:expect.any(Number)});
 expect(await dialog.evaluate(el=>{const b=el.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight})).toBeTruthy();
});

test('error del directorio muestra retry y no se interpreta como lista vacía',async({page})=>{
 let fail=true;
 await page.route(`${API}/contracts?**`,async route=>{
  if(route.request().url().includes('limit=10')&&fail) await route.fulfill({status:403,json:{detail:'No tienes permiso para consultar contratos'}});
  else await route.fallback();
 });
 await page.goto('/contratos');await expect(page.locator('.lands-list-message')).toBeVisible();
 fail=false;await page.locator('.lands-list-message').getByRole('button',{name:'Reintentar'}).click();
 await expect(page.locator('.tbl tbody')).toContainText('CT-001');
});

test('configurar plan y volver conserva los datos del contrato',async({page})=>{
 await page.route(`${API}/calculators/active?**`,route=>route.fulfill({json:null}));
 await page.route(`${API}/calculators?**`,route=>route.fulfill({json:[]}));
 await page.goto('/contratos');await page.getByRole('button',{name:'+ Generar Contrato',exact:true}).click();
 await page.locator('#cf-amount').fill('345000');await page.getByRole('button',{name:'Crear calculadora →'}).click();
 await expect(page.getByRole('button',{name:'Volver al contrato'})).toBeVisible();
 await page.getByRole('button',{name:'Volver al contrato'}).click();await expect(page.locator('#cf-amount')).toHaveValue('345000');
});

test('alta de cliente usa etiquetas y permite enviar desde teclado',async({page})=>{
 let submitted;
 await page.route(`${API}/clients`,async route=>{
  if(route.request().method()==='POST'){submitted=route.request().postDataJSON();await route.fulfill({json:{id:'new-client',...submitted}})}else await route.fallback();
 });
 await page.route(`${API}/clients/new-client/apps/lands`,route=>route.fulfill({json:{}}));
 await page.goto('/clientes');await page.getByRole('button',{name:'+ Agregar cliente',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Agregar cliente'});await dialog.getByLabel('Nombre *',{exact:true}).fill('Mariana');
 await dialog.getByLabel('Apellidos (opcional)').fill('Torres');await dialog.getByLabel('Correo electrónico (opcional)').fill('mariana@example.com');
 await dialog.getByLabel('Correo electrónico (opcional)').press('Enter');
 await expect(dialog).not.toBeVisible();expect(submitted.name).toBe('Mariana Torres');expect(submitted.email).toBe('mariana@example.com');
});
