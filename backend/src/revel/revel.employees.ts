import { BrowserContext } from 'playwright';
import { BASE_URL, ESTABLISHMENT_NAMES } from './revel.constants';

export interface RevelEmployee {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile_number: string | null;
  employee_start: string | null;
  is_active: boolean;
  establishment_id: number;
  establishment_name: string;
}

interface RevelApiResponse {
  meta: {
    total_count: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
  objects: Array<Record<string, unknown>>;
}

async function fetchPage(
  context: BrowserContext,
  url: string,
): Promise<RevelApiResponse> {
  const resp = await context.request.get(url);
  if (!resp.ok()) {
    throw new Error(`Revel API error: HTTP ${resp.status()} for ${url}`);
  }
  return resp.json() as Promise<RevelApiResponse>;
}

export async function fetchEmployeesForEstablishment(
  context: BrowserContext,
  establishmentId: number,
): Promise<RevelEmployee[]> {
  const employees: RevelEmployee[] = [];
  const estName = ESTABLISHMENT_NAMES[establishmentId] ?? `est_${establishmentId}`;

  let url: string | null =
    `${BASE_URL}/resources/Employee/?format=json&limit=100&Establishment=${establishmentId}`;

  while (url) {
    const data = await fetchPage(context, url);

    for (const obj of data.objects) {
      employees.push({
        id:               obj['id'] as number,
        first_name:       (obj['first_name'] as string) ?? '',
        last_name:        (obj['last_name'] as string) ?? '',
        email:            (obj['email'] as string | null) ?? null,
        mobile_number:    (obj['mobile_number'] as string | null) ?? null,
        employee_start:   (obj['employee_start'] as string | null) ?? null,
        is_active:        (obj['is_active'] as boolean) ?? true,
        establishment_id: establishmentId,
        establishment_name: estName,
      });
    }

    // Revel returns an absolute path — prepend base URL if needed
    const next = data.meta.next;
    if (next) {
      url = next.startsWith('http') ? next : `${BASE_URL}${next}`;
    } else {
      url = null;
    }
  }

  return employees;
}

export async function fetchAllEmployees(
  context: BrowserContext,
  establishmentIds: number[],
): Promise<RevelEmployee[]> {
  const all: RevelEmployee[] = [];

  for (const estId of establishmentIds) {
    try {
      console.log(`[Revel] Fetching employees for est=${estId}`);
      const employees = await fetchEmployeesForEstablishment(context, estId);
      console.log(`[Revel] est=${estId} — ${employees.length} employees`);
      all.push(...employees);
    } catch (err) {
      console.error(`[Revel] Failed to fetch employees for est=${estId}:`, err);
    }
  }

  return all;
}
