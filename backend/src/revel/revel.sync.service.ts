import { prisma } from '../lib/prisma';
import { ESTABLISHMENTS, ESTABLISHMENT_DB_LOCATION_NAME } from './revel.constants';
import { createRevelSession } from './revel.session';
import { fetchAllEmployees, RevelEmployee } from './revel.employees';

// Returns true if employee_start falls on exactly today - 30 days (same calendar date).
// A 1-day trailing buffer is included so a missed cron run doesn't lose employees
// whose anniversary was yesterday.
function justCompletedThirtyDays(employeeStart: string | null): boolean {
  if (!employeeStart) return false;
  const startDate = new Date(employeeStart);
  if (isNaN(startDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const thirtyOneDaysAgo = new Date(today);
  thirtyOneDaysAgo.setDate(today.getDate() - 31);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Window: [today - 31 days, today - 30 days] — catches today's batch + yesterday's if cron missed
  return start >= thirtyOneDaysAgo && start <= thirtyDaysAgo;
}

export interface SyncResult {
  fetched:  number;
  eligible: number;
  upserted: number;
  errors:   number;
}

// Builds a lookup map: establishmentId → { locationId, managerId }
async function buildEstablishmentLocationMap(): Promise<Map<number, { locationId: string; managerId: string | null }>> {
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, managerId: true },
  });

  const nameToLocation = new Map(locations.map((l) => [l.name, l]));
  const map = new Map<number, { locationId: string; managerId: string | null }>();

  for (const est of ESTABLISHMENTS) {
    const loc = nameToLocation.get(ESTABLISHMENT_DB_LOCATION_NAME[est.id]);
    if (loc) {
      map.set(est.id, { locationId: loc.id, managerId: loc.managerId });
    } else {
      console.warn(`[Revel Sync] No DB location found for establishment ${est.id} (${est.dbLocationName})`);
    }
  }

  return map;
}

export async function syncAygFoodsEmployees(): Promise<SyncResult> {
  console.log('[Revel Sync] Starting employee sync...');

  // Load location→manager mapping before hitting Revel
  const estLocationMap = await buildEstablishmentLocationMap();

  const { browser, context } = await createRevelSession();
  let allEmployees: RevelEmployee[] = [];

  try {
    const estIds = ESTABLISHMENTS.map((e) => e.id);
    allEmployees = await fetchAllEmployees(context, estIds);
  } finally {
    await browser.close();
  }

  const eligible = allEmployees.filter((e) => justCompletedThirtyDays(e.employee_start));

  console.log(
    `[Revel Sync] Fetched ${allEmployees.length} total, ${eligible.length} just hit 30-day mark`,
  );

  let upserted = 0;
  let errors = 0;

  for (const emp of eligible) {
    const locationInfo = estLocationMap.get(emp.establishment_id);

    try {
      await prisma.aygFoodsEmployee.upsert({
        where: { revelId: emp.id },
        update: {
          firstName:         emp.first_name,
          lastName:          emp.last_name,
          email:             emp.email,
          phone:             emp.mobile_number,
          employeeStart:     emp.employee_start ? new Date(emp.employee_start) : null,
          isActive:          emp.is_active,
          establishmentId:   emp.establishment_id,
          establishmentName: emp.establishment_name,
          locationId:        locationInfo?.locationId ?? null,
          managerId:         locationInfo?.managerId ?? null,
          syncedAt:          new Date(),
        },
        create: {
          revelId:           emp.id,
          firstName:         emp.first_name,
          lastName:          emp.last_name,
          email:             emp.email,
          phone:             emp.mobile_number,
          employeeStart:     emp.employee_start ? new Date(emp.employee_start) : null,
          isActive:          emp.is_active,
          establishmentId:   emp.establishment_id,
          establishmentName: emp.establishment_name,
          locationId:        locationInfo?.locationId ?? null,
          managerId:         locationInfo?.managerId ?? null,
          syncedAt:          new Date(),
        },
      });
      upserted++;
    } catch (err) {
      console.error(`[Revel Sync] Failed to upsert revelId=${emp.id}:`, err);
      errors++;
    }
  }

  console.log(`[Revel Sync] Done — upserted=${upserted}, errors=${errors}`);

  return {
    fetched:  allEmployees.length,
    eligible: eligible.length,
    upserted,
    errors,
  };
}
