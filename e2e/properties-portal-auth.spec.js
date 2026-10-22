import { test, expect } from '@playwright/test';
import { API } from './helpers/session.js';

// Datos sintéticos y todas las llamadas interceptadas; ninguna cuenta real se modifica.
async function mockPortal(page, overrides = {}) {
  const requests = [];
  await page.route(`${API}/**`, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '');
    requests.push({path, body: request.postDataJSON(), method: request.method()});
    if (overrides[path]) return overrides[path](route, request);
    const data = {
      '/portal/auth/login': {access_token: 'portal-access', refresh_token: 'portal-refresh'},
      '/portal/auth/me': {portal_identity_id: 'identity', organization_id: 'org', email: 'tenant@example.com', status: 'active'},
      '/portal/me': {persona_id: 'person', organization_id: 'org', nombre: 'QA Inquilino'},
      '/portal/units': [{id: 'unit', label: 'QA Casa 1', attributes: {}}],
      '/portal/relations': [{property_id: 'unit', roles: ['tenant'], flags: {can_vote: false}}],
      '/portal/statement': {total_due: 0, open_charges: []},
      '/portal/announcements': [], '/portal/votes': [], '/portal/packages': [],
    };
    if (path === '/portal/auth/accept-invite' || path === '/portal/auth/reset-password') return route.fulfill({status: 204});
    if (path === '/portal/auth/forgot-password') return route.fulfill({status: 200, json: {message: 'OK'}});
    return route.fulfill({status: path in data ? 200 : 404, json: data[path] || {error: {message: 'Ruta no simulada'}}});
  });
  return requests;
}

test('login de inquilino conserva la sesión administrativa y muestra su rol', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('lm_session', JSON.stringify({marker: 'staff-preserved'})));
  const requests = await mockPortal(page);
  await page.goto('/portal/acceso');
  await page.getByLabel('Correo', {exact: true}).fill('tenant@example.com');
  await page.getByLabel('Contraseña', {exact: true}).fill('Synthetic-pass-2026');
  await page.getByRole('button', {name: 'Entrar al portal'}).click();
  await expect(page).toHaveURL(/portal-comunidad/);
  await page.getByRole('button', {name: 'Mi unidad', exact: true}).click();
  await expect(page.getByText('Inquilino', {exact: true})).toBeVisible();
  expect(requests.find(r => r.path === '/portal/auth/login').body).toEqual({email: 'tenant@example.com', password: 'Synthetic-pass-2026'});
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ownterra_portal_session')))).toEqual({access_token: 'portal-access', refresh_token: 'portal-refresh'});
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lm_session')).marker)).toBe('staff-preserved');
});

test('invitación antigua conserva token y envía new_password a Core', async ({page}) => {
  const requests = await mockPortal(page);
  await page.goto('/servicio/invitacion?token=synthetic-invite');
  await expect(page.getByLabel('Token de invitación')).toHaveValue('synthetic-invite');
  await page.getByLabel('Contraseña', {exact: true}).fill('Synthetic-pass-2026');
  await page.getByLabel('Confirmar contraseña').fill('Synthetic-pass-2026');
  await page.getByRole('button', {name: 'Activar acceso', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Acceso activado'})).toBeVisible();
  expect(requests.find(r => r.path === '/portal/auth/accept-invite').body).toEqual({token: 'synthetic-invite', new_password: 'Synthetic-pass-2026'});
});

test('recuperación conserva correo ante 503 y permite reintentar sin revelar cuentas', async ({page}) => {
  let attempts = 0;
  const requests = await mockPortal(page, {'/portal/auth/forgot-password': route => route.fulfill(++attempts === 1
    ? {status: 503, json: {error: {message: 'Servicio temporalmente indisponible'}}}
    : {status: 200, json: {message: 'OK'}})});
  await page.goto('/portal/recuperar');
  await page.getByLabel('Correo de tu cuenta').fill('tenant@example.com');
  await page.getByRole('button', {name: 'Enviar instrucciones'}).click();
  await expect(page.getByRole('alert')).toContainText('El servicio no está disponible por el momento.');
  await expect(page.getByLabel('Correo de tu cuenta')).toHaveValue('tenant@example.com');
  await page.getByRole('button', {name: 'Enviar instrucciones'}).click();
  await expect(page.getByRole('status')).toContainText('Si el correo tiene una cuenta activa');
  expect(requests.filter(r => r.path === '/portal/auth/forgot-password').map(r => r.body)).toEqual([{email: 'tenant@example.com'}, {email: 'tenant@example.com'}]);
});

test('URL de correo Core restablece, valida confirmación y elimina sólo sesión portal', async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem('ownterra_portal_session', JSON.stringify({access_token: 'old', refresh_token: 'old-refresh'}));
    localStorage.setItem('lm_session', JSON.stringify({marker: 'staff-preserved'}));
  });
  const requests = await mockPortal(page);
  await page.goto('/portal/entrar/restablecer?token=synthetic-reset');
  await page.getByLabel('Nueva contraseña').fill('Synthetic-pass-2026');
  await page.getByLabel('Confirmar contraseña').fill('Other-password');
  await page.getByRole('button', {name: 'Guardar contraseña'}).click();
  await expect(page.getByRole('alert')).toContainText('no coinciden');
  expect(requests.some(r => r.path === '/portal/auth/reset-password')).toBe(false);
  await page.getByLabel('Confirmar contraseña').fill('Synthetic-pass-2026');
  await page.getByRole('button', {name: 'Guardar contraseña'}).click();
  await expect(page.getByRole('status')).toContainText('Contraseña actualizada');
  expect(requests.find(r => r.path === '/portal/auth/reset-password').body).toEqual({token: 'synthetic-reset', new_password: 'Synthetic-pass-2026'});
  expect(await page.evaluate(() => localStorage.getItem('ownterra_portal_session'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lm_session')).marker)).toBe('staff-preserved');
});

test('restablecimiento sin token ofrece pedir un enlace nuevo', async ({page}) => {
  await mockPortal(page); await page.goto('/portal/entrar/restablecer');
  await expect(page.getByRole('alert')).toContainText('Falta el enlace');
  await page.getByRole('button', {name: 'Solicitar otro enlace'}).click();
  await expect(page.getByLabel('Correo de tu cuenta')).toBeVisible();
});

test('identidades con organizaciones distintas no muestran unidades', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('ownterra_portal_session', JSON.stringify({access_token: 'synthetic-access', refresh_token: 'synthetic-refresh'})));
  await mockPortal(page, {'/portal/me': route => route.fulfill({status: 200, json: {organization_id: 'foreign-org', nombre: 'QA'}})});
  await page.goto('/portal-comunidad');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'QA Casa 1'})).toHaveCount(0);
});

test('refresh rechazado por cuenta suspendida vuelve al acceso sin afectar staff', async ({page}) => {
  await page.addInitScript(() => {
    localStorage.setItem('ownterra_portal_session', JSON.stringify({access_token: 'expired', refresh_token: 'synthetic-refresh'}));
    localStorage.setItem('lm_session', JSON.stringify({marker: 'staff-preserved'}));
  });
  await mockPortal(page, {
    '/portal/units': route => route.fulfill({status: 401, json: {error: {message: 'Expiró'}}}),
    '/portal/auth/refresh': route => route.fulfill({status: 403, json: {error: {message: 'Cuenta suspendida'}}}),
  });
  await page.goto('/portal-comunidad');
  await expect(page).toHaveURL(/portal\/acceso/);
  await expect(page.getByRole('button', {name: 'Entrar al portal'})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ownterra_portal_session'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lm_session')).marker)).toBe('staff-preserved');
});
