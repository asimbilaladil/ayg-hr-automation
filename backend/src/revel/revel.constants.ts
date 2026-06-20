export const BASE_URL = 'https://laynes.revelup.com';
export const STATE_FILE = '/tmp/revel_session.json';

export const ESTABLISHMENTS: Array<{ id: number; name: string; dbLocationName: string }> = [
  { id: 32, name: 'LCF Airtex',          dbLocationName: 'LCF Airtex' },
  { id: 14, name: 'LCF Beaumont',         dbLocationName: 'LCF Beaumont' },
  { id: 48, name: 'LCF Downtown Houston', dbLocationName: 'LCF Downtown Houston' },
  { id: 7,  name: 'LCF Ella',             dbLocationName: 'LCF Garden Oaks' },   // Revel name differs
  { id: 6,  name: 'LCF Katy',             dbLocationName: 'LCF Katy' },
  { id: 25, name: 'LCF Mission Bend',     dbLocationName: 'LCF Mission Bend' },
  { id: 36, name: 'LCF Missouri City',    dbLocationName: 'LCF Missouri City' },
  { id: 26, name: 'LCF Nederland',        dbLocationName: 'LCF Nederland' },
  { id: 20, name: 'LCF Pasadena',         dbLocationName: 'LCF Fairmont' },      // Revel name differs
  { id: 40, name: 'LCF Rosenberg',        dbLocationName: 'LCF Rosenberg' },
  { id: 15, name: 'LCF Shepherd',         dbLocationName: 'LCF Shepherd' },
];

export const ESTABLISHMENT_NAMES: Record<number, string> = Object.fromEntries(
  ESTABLISHMENTS.map((e) => [e.id, e.name]),
);

// Maps Revel establishment ID → the Location name as it appears in our DB
export const ESTABLISHMENT_DB_LOCATION_NAME: Record<number, string> = Object.fromEntries(
  ESTABLISHMENTS.map((e) => [e.id, e.dbLocationName]),
);
