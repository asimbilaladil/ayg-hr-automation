import { BrowserContext, Page } from 'playwright';
import { BASE_URL, ESTABLISHMENTS, ESTABLISHMENT_DB_LOCATION_NAME } from './revel.constants';
import { prisma } from '../lib/prisma';

export interface RevelEmployee {
  id:               number;
  firstName:        string;
  lastName:         string;
  email:            string | null;
  phone:            string | null;
  employeeStart:    string | null;
  isActive:         boolean;
  establishmentId:  number;
  establishmentName: string;
}

// Switches the Revel session to a specific establishment
async function switchEstablishment(context: BrowserContext, estId: number): Promise<void> {
  const csrf = (await context.cookies()).find((c) => c.name === 'csrftoken')?.value ?? '';
  await context.request.post(`${BASE_URL}/navigation/load_establishment_tree/`, {
    form: {
      establishments: String(estId),
      establishment:  String(estId),
      node_type:      '1',
      node_id:        String(estId),
      location:       '/users/employees/',
    },
    headers: { 'X-CSRFToken': csrf, 'Referer': `${BASE_URL}/dashboard/` },
  });
}

// Scrapes employee IDs from the /users/employees/ list page (already switched to establishment)
async function scrapeEmployeeIds(page: Page): Promise<number[]> {
  const anchors = page.locator('a[title="Edit"][href^="/users/employees/"]');
  const count   = await anchors.count();
  const hrefs: (string | null)[] = [];
  for (let i = 0; i < count; i++) {
    hrefs.push(await anchors.nth(i).getAttribute('href'));
  }

  const ids: number[] = [];
  for (const href of hrefs) {
    const match = href?.match(/\/users\/employees\/(\d+)\//);
    if (match) ids.push(parseInt(match[1], 10));
  }
  return ids;
}

// Calls /resources/Employee/{id}/ to get the employee's data
async function fetchEmployeeData(
  context: BrowserContext,
  revelId: number,
  estId: number,
  estName: string,
): Promise<RevelEmployee | null> {
  try {
    const resp = await context.request.get(
      `${BASE_URL}/resources/Employee/${revelId}/?format=json`,
    );
    if (!resp.ok()) return null;
    const obj = await resp.json() as Record<string, unknown>;

    return {
      id:               revelId,
      firstName:        (obj['first_name']     as string)  ?? '',
      lastName:         (obj['last_name']      as string)  ?? '',
      email:            (obj['email']           as string)  ?? null,
      phone:            (obj['phone_number']   as string)  ?? null,
      employeeStart:    (obj['employee_start'] as string)  ?? null,
      isActive:         (obj['active']          as boolean) ?? true,
      establishmentId:  estId,
      establishmentName: estName,
    };
  } catch {
    return null;
  }
}

export interface ScrapeResult {
  fetched:  number;
  eligible: number;
  upserted: number;
  errors:   number;
}

function justCompletedThirtyDays(employeeStart: string | null): boolean {
  if (!employeeStart) return false;
  const start = new Date(employeeStart);
  if (isNaN(start.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo  = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);
  const thirtyOneDaysAgo = new Date(today); thirtyOneDaysAgo.setDate(today.getDate() - 31);

  start.setHours(0, 0, 0, 0);
  return start >= thirtyOneDaysAgo && start <= thirtyDaysAgo;
}

/**
 * Main sync function:
 * 1. For each establishment: switch → scrape list page → get employee IDs
 * 2. For each ID: call /resources/Employee/{id}/ to get start date + details
 * 3. Filter for employees who just hit 30 days
 * 4. Upsert into AygFoodsEmployee with correct location + manager
 */
export async function scrapeAndSyncEmployees(context: BrowserContext): Promise<ScrapeResult> {
  // Load location→manager lookup once
  const locations = await prisma.location.findMany({
    select: { id: true, name: true, managerId: true },
  });
  const nameToLocation = new Map(locations.map((l) => [l.name, l]));

  const listPage = await context.newPage();
  const seenIds  = new Set<number>(); // avoid processing same employee twice across establishments
  let fetched = 0, eligible = 0, upserted = 0, errors = 0;

  for (const est of ESTABLISHMENTS) {
    console.log(`[Revel Sync] Processing est=${est.id} (${est.name})...`);

    await switchEstablishment(context, est.id);
    await listPage.goto(`${BASE_URL}/users/employees/`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const ids = await scrapeEmployeeIds(listPage);
    console.log(`[Revel Sync] est=${est.id} — ${ids.length} employees on list page`);

    const dbLocName = ESTABLISHMENT_DB_LOCATION_NAME[est.id];
    const loc       = dbLocName ? nameToLocation.get(dbLocName) : null;

    for (const revelId of ids) {
      if (seenIds.has(revelId)) continue; // already handled via another establishment
      seenIds.add(revelId);
      fetched++;

      const emp = await fetchEmployeeData(context, revelId, est.id, est.name);
      if (!emp) { errors++; continue; }

      if (!justCompletedThirtyDays(emp.employeeStart)) continue;
      eligible++;

      try {
        await prisma.aygFoodsEmployee.upsert({
          where: { revelId: emp.id },
          update: {
            firstName:         emp.firstName,
            lastName:          emp.lastName,
            email:             emp.email,
            phone:             emp.phone,
            employeeStart:     emp.employeeStart ? new Date(emp.employeeStart) : null,
            isActive:          emp.isActive,
            establishmentId:   emp.establishmentId,
            establishmentName: emp.establishmentName,
            locationId:        loc?.id         ?? null,
            managerId:         loc?.managerId  ?? null,
            syncedAt:          new Date(),
          },
          create: {
            revelId:           emp.id,
            firstName:         emp.firstName,
            lastName:          emp.lastName,
            email:             emp.email,
            phone:             emp.phone,
            employeeStart:     emp.employeeStart ? new Date(emp.employeeStart) : null,
            isActive:          emp.isActive,
            establishmentId:   emp.establishmentId,
            establishmentName: emp.establishmentName,
            locationId:        loc?.id         ?? null,
            managerId:         loc?.managerId  ?? null,
            syncedAt:          new Date(),
          },
        });
        upserted++;
      } catch (err) {
        console.error(`[Revel Sync] Failed to upsert revelId=${revelId}:`, err);
        errors++;
      }
    }
  }

  await listPage.close();
  console.log(`[Revel Sync] Done — fetched=${fetched}, eligible=${eligible}, upserted=${upserted}, errors=${errors}`);
  return { fetched, eligible, upserted, errors };
}
