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

// Helper to normalize 12-hour to 24-hour format
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

// Helper to find or create location
async function findOrCreateLocation(locationName: string): Promise<string> {
  const trimmedName = locationName.trim();

  let location = await prisma.location.findFirst({
    where: {
      name: {
        equals: trimmedName,
        mode: 'insensitive',
      },
    },
  });

  if (!location) {
    location = await prisma.location.create({
      data: {
        name: trimmedName,
        isActive: true,
      },
    });
  }

  return location.id;
}

// Helper to find or create manager
async function findOrCreateManager(managerName: string, managerEmail: string): Promise<string> {
  const trimmedName = managerName.trim();
  const trimmedEmail = managerEmail.trim();

  // Try to find by email first
  let manager = await prisma.user.findFirst({
    where: {
      email: {
        equals: trimmedEmail,
        mode: 'insensitive',
      },
    },
  });

  // If not found, try by name
  if (!manager) {
    manager = await prisma.user.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
        role: 'MANAGER',
      },
    });
  }

  // Create if not found
  if (!manager) {
    manager = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        role: 'MANAGER',
        passwordHash: null,
        isActive: true,
      },
    });
  }

  return manager.id;
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
  const where: Record<string, any> = {};

  if (query.location) {
    // Find location by name
    const location = await prisma.location.findFirst({
      where: {
        name: { contains: query.location, mode: 'insensitive' },
      },
    });
    if (location) where.locationId = location.id;
  }

  if (query.dayOfWeek) where.dayOfWeek = { equals: query.dayOfWeek, mode: 'insensitive' };

  if (query.managerEmail) {
    const manager = await prisma.user.findFirst({
      where: {
        email: { contains: query.managerEmail, mode: 'insensitive' },
      },
    });
    if (manager) where.managerId = manager.id;
  }

  if (query.active !== undefined) where.active = query.active;

  const data = await prisma.managerAvailability.findMany({
    where,
    include: {
      location_rel: true,
      manager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: [{ location_rel: { name: 'asc' } }, { dayOfWeek: 'asc' }],
  });

  return { data, total: data.length };
}

export async function getAvailabilitySlots(query: SlotsQuery & { limit?: number }) {
  const { location, dayOfWeek, date, limit } = query;

  // Find location
  const locationRecord = await prisma.location.findFirst({
    where: {
      name: { contains: location, mode: 'insensitive' },
    },
  });

  if (!locationRecord) return { slots: [] };

  const windows = await prisma.managerAvailability.findMany({
    where: {
      locationId: locationRecord.id,
      dayOfWeek: { equals: dayOfWeek, mode: 'insensitive' },
      active: true,
    },
    include: {
      location_rel: true,
      manager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!windows.length) return { slots: [] };

  // ✅ FIX TIMEZONE (NO UTC "Z")
  const dateStart = new Date(`${date}T00:00:00`);
  const dateEnd = new Date(`${date}T23:59:59`);

  const booked = await prisma.appointment.findMany({
    where: {
      locationId: locationRecord.id,
      interviewDate: { gte: dateStart, lte: dateEnd },
      active: true,
    },
    include: {
      manager_rel: {
        select: {
          email: true,
        },
      },
    },
  });

  console.log('📅 Checking date:', date);
  console.log('📍 Location:', location);
  console.log('🔖 Booked appointments:', booked.length);

  // ✅ Normalize booked times to 24-hour format for comparison
  const bookedSlots = new Set(
    booked.map((a) => {
      const normalizedTime = normalize12HourTo24Hour(a.startTime);
      console.log(
        `  → Booked: ${a.startTime} → ${normalizedTime} (${a.manager_rel?.email || 'any manager'})`
      );

      return a.manager_rel?.email
        ? `${a.manager_rel.email}__${normalizedTime}`
        : `ANY__${normalizedTime}`;
    })
  );

  const slots: Slot[] = [];

  for (const window of windows) {
    const startMinutes = timeToMinutes(window.startTime);
    const endMinutes = timeToMinutes(window.endTime);

    const duration = parseDuration(window.slotDuration || '15 Min');

    for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
      const slotStart = minutesToTime(t);
      const slotEnd = minutesToTime(t + duration);

      const managerKey = `${window.manager_rel!.email}__${slotStart}`;
      const anyManagerKey = `ANY__${slotStart}`;

      if (!bookedSlots.has(managerKey) && !bookedSlots.has(anyManagerKey)) {
        slots.push({
          date,
          day: dayOfWeek,
          startTime: slotStart,
          endTime: slotEnd,
          displayTime: formatTo12Hour(slotStart),
          managerName: window.manager_rel!.name,
          managerEmail: window.manager_rel!.email,
          location: window.location_rel!.name,
        });
      } else {
        console.log(`  ✖ Slot blocked: ${slotStart} for ${window.manager_rel!.email}`);
      }
    }
  }

  console.log(`✅ Available slots found: ${slots.length}`);

  return {
    slots: limit ? slots.slice(0, limit) : slots,
  };
}

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

export async function validateSlot(input: { location: string; date: string; time: string }) {
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

  const alternatives = slots.slice(0, 3).map((s: Slot) => s.displayTime);

  return {
    available: false,
    message: 'Slot not available',
    alternatives,
  };
}

// ---------------- CRUD ----------------

export async function getAvailabilityById(id: string) {
  const item = await prisma.managerAvailability.findUnique({
    where: { id },
    include: {
      location_rel: true,
      manager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
  if (!item) throw new Error('NOT_FOUND');
  return item;
}

export async function createAvailability(data: CreateAvailabilityInput) {
  // Find or create location
  const locationId = await findOrCreateLocation(data.location);

  // Find or create manager
  const managerId = await findOrCreateManager(data.managerName, data.managerEmail);

  return prisma.managerAvailability.create({
    data: {
      locationId,
      managerId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotDuration: data.slotDuration,
      active: data.active,
      location: data.location,
      managerName: data.managerName,
      managerEmail: data.managerEmail,
    },
    include: {
      location_rel: true,
      manager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function updateAvailability(id: string, data: UpdateAvailabilityInput) {
  const existing = await prisma.managerAvailability.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND');

  const updateData: any = {
    ...(data.dayOfWeek && { dayOfWeek: data.dayOfWeek }),
    ...(data.startTime && { startTime: data.startTime }),
    ...(data.endTime && { endTime: data.endTime }),
    ...(data.slotDuration && { slotDuration: data.slotDuration }),
    ...(data.active !== undefined && { active: data.active }),
  };

  // Handle location update
  if (data.location) {
    const locationId = await findOrCreateLocation(data.location);
    updateData.locationId = locationId;
  }

  // Handle manager update
  if (data.managerName && data.managerEmail) {
    const managerId = await findOrCreateManager(data.managerName, data.managerEmail);
    updateData.manager_relId = managerId;
  }

  return prisma.managerAvailability.update({
    where: { id },
    data: updateData,
    include: {
      location_rel: true,
      manager_rel: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function deleteAvailability(id: string) {
  const existing = await prisma.managerAvailability.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND');

  return prisma.managerAvailability.delete({ where: { id } });
}
