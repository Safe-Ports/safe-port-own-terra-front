import {test, expect} from '@playwright/test';
import {prepare, expectFits} from './helpers/properties.js';

for (const width of [1440, 390]) {
  test(`Properties: composición y formularios a ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 1000});
    await prepare(page);
    for (const [name, path] of [['inicio','/properties'], ['comunidades','/properties/comunidades'], ['proveedores','/properties/responsables'], ['portafolio','/properties/portafolio']]) {
      await page.goto(path);
      await expect(page.locator('.eco-root.properties-focus main').first()).toBeVisible();
      await expectFits(page);
      await expect(page.locator('.eco-root:not(.dialog-theme)')).toHaveCSS('--deep', '#1e3a5f');
      // El nombre de la sección vive en la barra superior y es el encabezado de la página.
      await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible();
      if (width > 900) {
        const rail = page.getByRole('navigation', {name: 'Navegación de Properties'});
        await expect(page.locator('.eco-root .main')).toBeVisible();
        const before = await page.locator('.eco-root .main').boundingBox();
        await rail.hover();
        expect((await page.locator('.eco-root .main').boundingBox()).x).toBe(before.x);
        await expect(rail).toHaveCSS('width', '240px');
        await expect(rail.getByText('Comunidades', {exact: true})).toBeVisible();
      }
      await page.screenshot({path: `/private/tmp/properties-design-${name}-${width}.png`});
    }
    await page.goto('/properties/propietarios');
    await page.getByRole('button', {name: 'Nuevo propietario'}).click();
    const dialog = page.getByRole('dialog', {name: 'Nuevo propietario'});
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(el => el.closest('.dialog-theme').parentElement === document.body)).toBe(true);
    await expect(dialog).toHaveCSS('border-radius', '20px');
    for (const input of await dialog.locator('input:visible:not([type=checkbox]),select:visible').all()) {
      expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    }
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await page.screenshot({path: `/private/tmp/properties-design-formulario-${width}.png`});
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // La hoja sigue cargada: Core debe conservar su propia paleta y navegación.
    await page.goto('/ecosistema');
    await expect(page.locator('.eco-root')).toHaveCSS('--deep', '#07393C');
    await expect(page.locator('.eco-root.properties-focus')).toHaveCount(0);
  });
}
