import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const EMAIL = 'pelayognzlez@gmail.com';
const PASS = '123123';
const OUT = 'public/screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(2000);

  // Click "Ya tengo cuenta" to open auth modal
  const loginBtn = page.locator('button', { hasText: 'Ya tengo cuenta' });
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
    await page.waitForTimeout(1500);
  }

  // Fill the modal form - target inputs inside the dialog
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input[type="email"]').fill(EMAIL);
  await dialog.locator('input[type="password"]').fill(PASS);

  // Click "Entrar" button inside dialog
  const entrarBtn = dialog.locator('button', { hasText: 'Entrar' });
  if (await entrarBtn.isVisible()) {
    await entrarBtn.click();
  } else {
    await dialog.locator('button[type="submit"]').first().click();
  }

  await page.waitForTimeout(5000);
  console.log('After login URL:', page.url());

  if (page.url().includes('/login')) {
    await page.screenshot({ path: `${OUT}/debug-login-fail.png` });
    console.log('Login failed, check debug screenshot');
    await browser.close();
    return;
  }

  console.log('Login successful! Taking screenshots...');

  // Dashboard
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/dashboard.png`, fullPage: false });
  console.log('Dashboard done');

  // CRM
  await page.goto(`${BASE}/crm`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/crm.png`, fullPage: false });
  console.log('CRM done');

  // Comparador
  await page.goto(`${BASE}/comparator`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/comparator.png`, fullPage: false });
  console.log('Comparator done');

  // Contratos
  await page.goto(`${BASE}/contracts`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/contracts.png`, fullPage: false });
  console.log('Contracts done');

  // Mensajeria
  await page.goto(`${BASE}/admin/messages`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/messaging.png`, fullPage: false });
  console.log('Messaging done');

  // Tarifario
  await page.goto(`${BASE}/admin/tariffs`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/tariffs.png`, fullPage: false });
  console.log('Tariffs done');

  // Settings
  await page.goto(`${BASE}/settings`);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/settings.png`, fullPage: false });
  console.log('Settings done');

  await browser.close();
  console.log('Done! Screenshots saved to', OUT);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
