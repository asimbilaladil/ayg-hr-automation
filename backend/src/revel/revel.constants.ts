export const BASE_URL = 'https://laynes.revelup.com';
export const STATE_FILE = '/tmp/revel_session.json';

export const ESTABLISHMENTS: Array<{ id: number; name: string }> = [
  { id: 32, name: 'LCF Airtex' },
  { id: 14, name: 'LCF Beaumont' },
  { id: 48, name: 'LCF Downtown Houston' },
  { id: 7,  name: 'LCF Ella' },
  { id: 6,  name: 'LCF Katy' },
  { id: 25, name: 'LCF Mission Bend' },
  { id: 36, name: 'LCF Missouri City' },
  { id: 26, name: 'LCF Nederland' },
  { id: 20, name: 'LCF Pasadena' },
  { id: 40, name: 'LCF Rosenberg' },
  { id: 15, name: 'LCF Shepherd' },
];

export const ESTABLISHMENT_NAMES: Record<number, string> = Object.fromEntries(
  ESTABLISHMENTS.map((e) => [e.id, e.name]),
);
