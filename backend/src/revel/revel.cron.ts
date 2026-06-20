import cron from 'node-cron';
import { syncAygFoodsEmployees } from './revel.sync.service';

// Runs every day at 02:00 AM server time
const SCHEDULE = '0 2 * * *';

export function startRevelSyncCron(): void {
  cron.schedule(SCHEDULE, async () => {
    console.log('[Revel Cron] Daily employee sync triggered');
    try {
      const result = await syncAygFoodsEmployees();
      console.log('[Revel Cron] Sync complete:', result);
    } catch (err) {
      console.error('[Revel Cron] Sync failed:', err);
    }
  });

  console.log(`[Revel Cron] Scheduled daily employee sync at ${SCHEDULE} (02:00 AM)`);
}
