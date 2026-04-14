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

// Add this helper function at the top with other helpers
function normalize12HourTo24Hour(time: string): string {
  // If already in 24-hour format (HH:MM), return as is
  if (!time.includes('AM') && !time.includes('PM')) {
    return time;
  }
  
  // Parse 12-hour format
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time;
  
  let [_, hourStr, minute, period] = match;
  let hour = parseInt(hourStr);
  
  if (period.toUpperCase() === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${String(hour).padStart(2, '0')}:${minute}`;
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

// Update the getAvailabilitySlots function
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

  console.log('📅 Checking date:', date);
  console.log('📍 Location:', location);
  console.log('🔖 Booked appointments:', booked.length);

  // ✅ FIX: Normalize booked times to 24-hour format for comparison
  const bookedSlots = new Set(
    booked.map((a) => {
      const normalizedTime = normalize12HourTo24Hour(a.startTime);
      console.log(`  → Booked: ${a.startTime} → ${normalizedTime} (${a.managerEmail || 'any manager'})`);
      
      // If manager email exists, include it in the key
      // Otherwise, block the time for ALL managers
      return a.managerEmail 
        ? `${a.managerEmail}__${normalizedTime}`
        : `ANY__${normalizedTime}`;
    })
  );

  const slots: Slot[] = [];

  for (const window of windows) {
    const startMinutes = timeToMinutes(window.startTime);
    const endMinutes = timeToMinutes(window.endTime);

    const duration = parseDuration(window.slotDuration || '15 Min');

    for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
      const slotStart = minutesToTime(t); // This is in 24-hour format (HH:MM)
      const slotEnd = minutesToTime(t + duration);

      // Check both manager-specific and ANY bookings
      const managerKey = `${window.managerEmail}__${slotStart}`;
      const anyManagerKey = `ANY__${slotStart}`;

      if (!bookedSlots.has(managerKey) && !bookedSlots.has(anyManagerKey)) {
        slots.push({
          date,
          day: dayOfWeek,
          startTime: slotStart, // Keep in 24-hour for consistency
          endTime: slotEnd,
          displayTime: formatTo12Hour(slotStart), // ✅ USA format for display
          managerName: window.managerName,
          managerEmail: window.managerEmail,
          location: window.location,
        });
      } else {
        console.log(`  ✖ Slot blocked: ${slotStart} for ${window.managerEmail}`);
      }
    }
  }

  console.log(`✅ Available slots found: ${slots.length}`);
  
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
