import { expect, test } from '@playwright/test';

test('login page renders Vercel Geist dark mode by default, switches themes cleanly, and exposes OIDC CTA', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Iniciar sesión|Bienvenido/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continuar con Keycloak|Iniciar sesión/i })).toBeEnabled();

  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Tema Claro' }).click();
  await expect(html).not.toHaveClass(/dark/);
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Tema Oscuro' }).click();
  await expect(html).toHaveClass(/dark/);
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

test('protected route redirects to login without an authenticated OIDC session', async ({ page }) => {
  await page.goto('/app/knowledge');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /Iniciar sesión|Bienvenido/i })).toBeVisible();
});

test('unknown route renders 404 recovery view with SPA navigation link', async ({ page }) => {
  await page.goto('/ruta-inexistente');
  await expect(page.getByRole('heading', { name: /404/ })).toBeVisible();
  const returnLink = page.getByRole('link', { name: 'Regresar a la consola' });
  await expect(returnLink).toBeVisible();
  await returnLink.click();
  await expect(page.getByRole('heading', { level: 1, name: /Iniciar sesión|Bienvenido/i })).toBeVisible();
});
