import { expect, type Page } from '@playwright/test';

export async function loginViaKeycloakPkce(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Iniciar sesión|Bienvenido/i })).toBeVisible();
  await page.getByRole('button', { name: /Continuar con Keycloak|Iniciar sesión/i }).click();

  await expect(page.locator('#kc-form-login')).toBeVisible({ timeout: 25_000 });
  await page.locator('#username').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();

  await expect(
    page.getByRole('heading', { level: 1, name: /Conocimiento confiable, de extremo a extremo/i }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function navigateAppSection(page: Page, linkLabel: string): Promise<void> {
  const mobileMenuBtn = page.getByRole('button', { name: 'Abrir menú de navegación' });
  if (await mobileMenuBtn.isVisible()) {
    await mobileMenuBtn.click();
    const mobileNav = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole('link', { name: linkLabel, exact: true }).click();
    await expect(mobileNav).toBeHidden();
    return;
  }

  const desktopNav = page.getByRole('navigation', { name: 'Navegación principal' });
  await desktopNav.getByRole('link', { name: linkLabel, exact: true }).click();
}

export async function logoutFromConsole(page: Page): Promise<void> {
  const mobileMenuBtn = page.getByRole('button', { name: 'Abrir menú de navegación' });
  if (await mobileMenuBtn.isVisible()) {
    await mobileMenuBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Cerrar sesión/i }).click();
  } else {
    await page.getByRole('button', { name: /Cerrar sesión/i }).click();
  }

  await expect(page.getByRole('heading', { level: 1, name: /Iniciar sesión|Bienvenido/i })).toBeVisible({
    timeout: 25_000,
  });
}
