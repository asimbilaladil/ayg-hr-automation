import { prisma } from '../lib/prisma';
import { ESTABLISHMENTS } from './revel.constants';
import { createRevelSession } from './revel.session';
import { fetchAllEmployees, RevelEmployee } from './revel.employees';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function hasCompletedThirtyDays(employeeStart: string | null): boolean {
  if (!employeeStart) return false;
  const startDate = new Date(employeeStart);
  if (isNaN(startDate.getTime())) return false;
  return Date.now() - startDate.getTime() >= THIRTY_DAYS_MS;
}

export interface SyncResult {
  fetched:  number;
  eligible: number;
  upserted: number;
  errors:   number;
}

export async function syncAygFoodsEmployees(): Promise<SyncResult> {
  console.log('[Revel Sync] Starting employee sync...');

  const { browser, context } = await createRevelSession();
  let allEmployees: RevelEmployee[] = [];

  try {
    const estIds = ESTABLISHMENTS.map((e) => e.id);
    allEmployees = await fetchAllEmployees(context, estIds);
  } finally {
    await browser.close();
  }

  const eligible = allEmployees.filter((e) => hasCompletedThirtyDays(e.employee_start));

  console.log(
    `[Revel Sync] Fetched ${allEmployees.length} total, ${eligible.length} completed 30 days`,
  );

  let upserted = 0;
  let errors = 0;

  for (const emp of eligible) {
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
