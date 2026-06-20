import fs from 'fs';
import { chromium, Browser, BrowserContext } from 'playwright';
import { env } from '../config/env';

function getCredentials(): { user: string; pass: string } {
  const user = env.REVEL_USER;
  const pass = env.REVEL_PASS;
  if (!user || !pass) throw new Error('REVEL_USER and REVEL_PASS must be set in .env');
  return { user, pass };
}
import { BASE_URL, STATE_FILE } from './revel.constants';

async function loginAndSave(context: BrowserContext): Promise<void> {
  const { user, pass } = getCredentials();
  console.log('[Revel] Logging in...');
  const page = await context.newPage();
  await page.goto(BASE_URL);
  await page.waitForURL('**authentication.revelup.com**', { timeout: 60000 });
  await page.waitForSelector('input[name="username"]', { timeout: 60000 });
  await page.fill('input[name="username"]', user);
  await page.click('button[type="submit"]');
  await page.waitForSelector('input[name="password"]', { timeout: 60000 });
  await page.fill('input[name="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  await context.storageState({ path: STATE_FILE });
  await page.close();
  console.log('[Revel] Login successful — session saved');
}

export async function createRevelSession(): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await chromium.launch({ headless: true });

  const context = fs.existsSync(STATE_FILE)
    ? await browser.newContext({ storageState: STATE_FILE })
    : await browser.newContext();

  // Probe whether the saved session is still valid
  if (fs.existsSync(STATE_FILE)) {
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    const expired = page.url().includes('authentication') || page.url().includes('login');
    await page.close();

    if (expired) {
      console.log('[Revel] Session expired — re-logging in');
      await loginAndSave(context);
    } else {
      console.log('[Revel] Session valid');
    }
  } else {
    await loginAndSave(context);
  }

  return { browser, context };
}
