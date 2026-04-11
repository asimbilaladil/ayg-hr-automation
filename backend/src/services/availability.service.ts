import { prisma } from '../lib/prisma';
import {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  SlotsQuery,
  AvailabilityQuery,
} from '../schemas/availability.schema';

// ✅ SET YOUR TARGET TIMEZONE (TEXAS)
const TIMEZONE = 'America/Chicago';

// ---------------- HELPERS ----------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ✅ Convert to 12-hour format for USA
function formatTo12Hour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// ✅ Parse "15 Min" → 15
function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1]) : 15;
}

// ---------------- TYPES ----------------

type Slot = {
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  displayTime: string;
  managerName: string;
  managerEmail: string;
  location: string;
};

// ---------------- SERVICES ----------------

export async function listAvailability(query: AvailabilityQuery) {
  const where: Record<string, unknown> = {};

  if (query.location) where.location = { contains: query.location, mode: 'insensitive' };
  if (query.dayOfWeek) where.dayOfWeek = { equals: query.dayOfWeek, mode: 'insensitive' };
  if (query.managerEmail) where.managerEmail = { contains: query.managerEmail, mode: 'insensitive' };
  if (query.active !== undefined) where.active = query.active;

  const data = await prisma.managerAvailability.findMany({
    where,
    orderBy: [{ location: 'asc' }, { managerName: 'asc' }, { dayOfWeek: 'asc' }],
  });

  return { data, total: data.length };
}

// ---------------- MAIN SLOT GENERATION ----------------

export async function getAvailabilitySlots(
  query: SlotsQuery & { limit?: number }
) {
  const { location, dayOfWeek, date, limit } = query;

  const windows = await prisma.managerAvailability.findMany({
    where: {
      location: { contains: location, mode: 'insensitive' },
      dayOfWeek: { equals: dayOfWeek, mode: 'insensitive' },
      active: true,
    },
  });

  if (!windows.length) return { slots: [] };

  // ✅ FIX TIMEZONE (NO UTC "Z")
  const dateStart = new Date(`${date}T00:00:00`);
  const dateEnd = new Date(`${date}T23:59:59`);

  const booked = await prisma.appointment.findMany({
    where: {
      location: { contains: location, mode: 'insensitive' },
      interviewDate: { gte: dateStart, lte: dateEnd },
      active: true,
    },
  });

  const bookedSlots = new Set(
    booked.map((a) => `${a.managerEmail}__${a.startTime}`)
  );

  const slots: Slot[] = [];

  for (const window of windows) {
    const startMinutes = timeToMinutes(window.startTime);
    const endMinutes = timeToMinutes(window.endTime);

    const duration = parseDuration(window.slotDuration || '15 Min');

    for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
      const slotStart = minutesToTime(t);
      const slotEnd = minutesToTime(t + duration);

      const key = `${window.managerEmail}__${slotStart}`;

      if (!bookedSlots.has(key)) {
        slots.push({
          date,
          day: dayOfWeek,
          startTime: slotStart,
          endTime: slotEnd,
          displayTime: formatTo12Hour(slotStart), // ✅ USA format
          managerName: window.managerName,
          managerEmail: window.managerEmail,
          location: window.location,
        });
      }
    }
  }

  return {
    slots: limit ? slots.slice(0, limit) : slots,
  };
}

// ---------------- SUGGESTIONS ----------------

export async function getSuggestedSlots(location: string) {
  const results: any[] = [];

  const now = new Date();

  // ✅ Use Texas timezone
  const todayStr = now.toLocaleDateString('en-CA', {
    timeZone: TIMEZONE,
  });

  const today = new Date(todayStr + 'T00:00:00');

  for (let i = 0; i < 10; i++) {
    const dateObj = new Date(today);
    dateObj.setDate(today.getDate() + i);

    const date = dateObj.toISOString().slice(0, 10);

    const dayOfWeek = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
    });

    const { slots } = await getAvailabilitySlots({
      location,
      dayOfWeek,
      date,
      limit: 5,
    });

    if (slots.length > 0) {
      results.push({
        date,
        day: dayOfWeek,
        time: slots[0].displayTime,
        display: `${dayOfWeek} at ${slots[0].displayTime}`,
      });
    }

    if (results.length === 3) break;
  }

  return { suggestions: results };
}

// ---------------- VALIDATE SLOT ----------------

export async function validateSlot(input: {
  location: string;
  date: string;
  time: string;
}) {
  const { location, date, time } = input;

  const dayOfWeek = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
  });

  const { slots } = await getAvailabilitySlots({
    location,
    dayOfWeek,
    date,
  });

  const match = slots.find((s: Slot) => s.startTime === time);

  if (match) {
    return {
      available: true,
      message: 'Slot is available',
      slot: match,
    };
  }

  const alternatives = slots
    .slice(0, 3)
    .map((s: Slot) => s.displayTime);

  return {
    available: false,
    message: 'Slot not available',
    alternatives,
  };
}

// ---------------- CRUD ----------------

export async function getAvailabilityById(id: string) {
  const item = await prisma.managerAvailability.findUnique({ where: { id } });
  if (!item) throw new Error('NOT_FOUND');
  return item;
}

export async function createAvailability(data: CreateAvailabilityInput) {
  return prisma.managerAvailability.create({ data });
}

export async function updateAvailability(id: string, data: UpdateAvailabilityInput) {
  const existing = await prisma.managerAvailability.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND');

  return prisma.managerAvailability.update({ where: { id }, data });
}

export async function deleteAvailability(id: string) {
  const existing = await prisma.managerAvailability.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND');

  return prisma.managerAvailability.delete({ where: { id } });
}
