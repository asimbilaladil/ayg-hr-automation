import { createRevelSession } from './revel.session';
import { scrapeAndSyncEmployees, ScrapeResult } from './revel.scrape';

export type { ScrapeResult as SyncResult };

export async function syncAygFoodsEmployees(): Promise<ScrapeResult> {
  console.log('[Revel Sync] Starting employee sync...');
  const { browser, context } = await createRevelSession();
  try {
    return await scrapeAndSyncEmployees(context);
  } finally {
    await browser.close();
  }
}
