import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  SlotsQuery,
  AvailabilityQuery,
} from '../schemas/availability.schema';

const TIMEZONE = 'America/Chicago';

// Helper function to flatten availability response
function flattenAvailability(availability: any) {
  return {
    ...availability,
    managerName: availability.manager_rel?.name || null,
    managerEmail: availability.manager_rel?.email || null,
    location: availability.location_rel?.name || null,
    // Remove nested objects
    manager_rel: undefined,
    location_rel: undefined,
  };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTo12Hour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1]) : 15;
}

function normalize12HourTo24Hour(time: string): string {
  if (!time.includes('AM') && !time.includes('PM')) return time;

  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time;

  let [_, hourStr, minute, period] = match;
  let hour = parseInt(hourStr);

  if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  else if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

async function findOrCreateLocation(locationName: string): Promise<string> {
  const trimmedName = locationName.trim();

  let location = await prisma.location.findFirst({
    where: { name: { equals: trimmedName, mode: 'insensitive' } },
  });

  if (!location) {
    location = await prisma.location.create({
      data: { name: trimmedName, isActive: true },
    });
  }

  return location.id;
}

async function findOrCreateManager(managerName: string, managerEmail: string, locationIds?: string[]): Promise<string> {
  const trimmedName = managerName.trim();
  const trimmedEmail = managerEmail.trim();

  let manager = await prisma.user.findFirst({
    where: { email: { equals: trimmedEmail, mode: 'insensitive' } },
  });

  if (!manager) {
    manager = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
      },
    });

    // If locationIds provided, assign manager to those locations
    if (locationIds && locationIds.length > 0) {
      await prisma.location.updateMany({
        where: { id: { in: locationIds } },
        data: { managerId: manager.id },
      });
    }
  }

  return manager.id;
}

export async function listAvailability(
  query: AvailabilityQuery,
  scopedManagerId?: string,  // when set, restrict to this manager's windows
) {
  const where: Record<string, any> = {};

  // Manager-scoped: only show their own availability windows
  if (scopedManagerId) {
    where.managerId = scopedManagerId;
  }

  if (query.location) {
    const location = await prisma.location.findFirst({
      where: { name: { contains: query.location, mode: 'insensitive' } },
    });
    if (location) where.locationId = location.id;
  }

  if (query.dayOfWeek) where.dayOfWeek = { equals: query.dayOfWeek, mode: 'insensitive' };

  if (query.managerEmail) {
    const manager = await prisma.user.findFirst({
      where: { email: { contains: query.managerEmail, mode: 'insensitive' } },
    });
    if (manager) where.managerId = manager.id;
  }

  if (query.active !== undefined) where.active = query.active;

  const data = await prisma.managerAvailability.findMany({
    where,
    include: {
      location_rel: true,
      manager_rel: true,
    },
    orderBy: [{ location_rel: { name: 'asc' } }, { dayOfWeek: 'asc' }],
  });

  return { data: data.map(flattenAvailability), total: data.length };
}

// ✅ NEW: get by id
export async function getAvailabilityById(id: string) {
  const availability = await prisma.managerAvailability.findUnique({
    where: { id },
    include: {
      location_rel: true,
      manager_rel: true,
    },
  });
  if (!availability) return null;
  return flattenAvailability(availability);
}

/**
 * Resolve a location from whatever ID n8n passes.
 * Handles three cases:
 *   1. It IS a Location.id              → use directly
 *   2. It IS a User.id (manager)        → find their assigned Location
 *   3. It IS a location name (text)     → find by name (backward compat)
 */
async function resolveLocation(idOrName: string): Promise<{ id: string; name: string } | null> {
  // Case 1: try as Location.id
  const byId = await prisma.location.findUnique({ where: { id: idOrName } });
  if (byId) return { id: byId.id, name: byId.name };

  // Case 2: try as User (manager) id → find their location
  const managerLocation = await prisma.location.findFirst({
    where: { managerId: idOrName, isActive: true },
  });
  if (managerLocation) return { id: managerLocation.id, name: managerLocation.name };

  // Case 3: try as location name (backward compatibility)
  const byName = await prisma.location.findFirst({
    where: { name: { contains: idOrName, mode: 'insensitive' } },
  });
  if (byName) return { id: byName.id, name: byName.name };

  return null;
}

export async function getAvailabilitySlots(query: SlotsQuery & { limit?: number }) {
  const { locationId, dayOfWeek, date, limit } = query;

  // ── Resolve location — works with locationId, managerId, or name ─────────
  const locationRecord = await resolveLocation(locationId);

  if (!locationRecord) {
    console.warn(`getAvailabilitySlots: cannot resolve location from "${locationId}"`);
    return { slots: [] };
  }

  // ── Fetch availability windows for this location + day ────────────────────
  const windows = await prisma.managerAvailability.findMany({
    where: {
      locationId: locationRecord.id,
      dayOfWeek: { equals: dayOfWeek, mode: 'insensitive' },
      active: true,
    },
    include: {
      location_rel: true,
      manager_rel:  true,
    },
  });

  if (!windows.length) return { slots: [] };

  // ── Fetch booked appointments for this location on the given date ─────────
  const dateStart = new Date(`${date}T00:00:00`);
  const dateEnd   = new Date(`${date}T23:59:59`);

  const booked = await prisma.appointment.findMany({
    where: {
      locationId: locationRecord.id,
      interviewDate: { gte: dateStart, lte: dateEnd },
    },
    include: { manager_rel: true },
  });

  // Key format: "<managerEmail>__<HH:MM>" or "ANY__<HH:MM>" for unassigned
  const bookedSlots = new Set(
    booked.map((a: any) => {
      const normalizedTime = normalize12HourTo24Hour(a.startTime);
      return a.manager_rel?.email
        ? `${a.manager_rel.email}__${normalizedTime}`
        : `ANY__${normalizedTime}`;
    })
  );

  // ── Generate time slots from each availability window ────────────────────
  const slots: any[] = [];

  for (const window of windows) {
    const startMinutes = timeToMinutes(window.startTime);
    const endMinutes   = timeToMinutes(window.endTime);
    const duration     = parseDuration(window.slotDuration || '15 Min');

    for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
      const slotStart = minutesToTime(t);
      const slotEnd   = minutesToTime(t + duration);

      const managerKey    = `${window.manager_rel!.email}__${slotStart}`;
      const anyManagerKey = `ANY__${slotStart}`;

      if (!bookedSlots.has(managerKey) && !bookedSlots.has(anyManagerKey)) {
        slots.push({
          date,
          day:          dayOfWeek,
          startTime:    slotStart,
          endTime:      slotEnd,
          displayTime:  formatTo12Hour(slotStart),
          managerName:  window.manager_rel!.name,
          managerEmail: window.manager_rel!.email,
          location:     locationRecord.name,
          locationId:   locationRecord.id,
        });
      }
    }
  }

  return {
    slots: limit ? slots.slice(0, limit) : slots,
  };
}

/**
 * getSuggestedSlots — returns availability suggestions across the next 7 days.
 *
 * Rules:
 *   • Controller passes locationId + an array of { date, dayOfWeek } for 7 days.
 *   • We collect every day that has at least one free slot.
 *   • If only 1 day has slots  → return the first 3 slots from that day.
 *   • If 2+ days have slots   → return ALL slots for EACH of those days.
 */
export async function getSuggestedSlots(input: {
  locationId: string;
  days: Array<{ date: string; dayOfWeek: string }>;
}) {
  const { locationId, days } = input;

  // Resolve location once (handles locationId, managerId, or name)
  const locationRecord = await resolveLocation(locationId);
  if (!locationRecord) {
    console.warn(`getSuggestedSlots: cannot resolve location from "${locationId}"`);
    return { slots: [], daysWithSlots: 0 };
  }

  // Collect slots grouped by day
  const slotsByDay: Array<{ date: string; dayOfWeek: string; slots: any[] }> = [];

  for (const { date, dayOfWeek } of days) {
    // Fetch availability windows for this location + day
    const windows = await prisma.managerAvailability.findMany({
      where: {
        locationId: locationRecord.id,
        dayOfWeek: { equals: dayOfWeek, mode: 'insensitive' },
        active: true,
      },
      include: { location_rel: true, manager_rel: true },
    });

    if (!windows.length) continue;

    // Fetch booked appointments for this location on this date
    const dateStart = new Date(`${date}T00:00:00`);
    const dateEnd   = new Date(`${date}T23:59:59`);

    const booked = await prisma.appointment.findMany({
      where: {
        locationId: locationRecord.id,
        interviewDate: { gte: dateStart, lte: dateEnd },
      },
      include: { manager_rel: true },
    });

    const bookedSet = new Set(
      booked.map((a: any) => {
        const t = normalize12HourTo24Hour(a.startTime);
        return a.manager_rel?.email ? `${a.manager_rel.email}__${t}` : `ANY__${t}`;
      })
    );

    // Generate free slots from all windows for this day
    const daySlots: any[] = [];

    for (const window of windows) {
      const startMins = timeToMinutes(window.startTime);
      const endMins   = timeToMinutes(window.endTime);
      const duration  = parseDuration(window.slotDuration || '15 Min');

      for (let t = startMins; t + duration <= endMins; t += duration) {
        const slotStart = minutesToTime(t);
        const slotEnd   = minutesToTime(t + duration);

        const managerKey = `${window.manager_rel!.email}__${slotStart}`;
        const anyKey     = `ANY__${slotStart}`;

        if (!bookedSet.has(managerKey) && !bookedSet.has(anyKey)) {
          daySlots.push({
            date,
            day:          dayOfWeek,
            startTime:    slotStart,
            endTime:      slotEnd,
            displayTime:  formatTo12Hour(slotStart),
            managerName:  window.manager_rel!.name,
            managerEmail: window.manager_rel!.email,
            location:     locationRecord.name,
            locationId:   locationRecord.id,
          });
        }
      }
    }

    if (daySlots.length > 0) {
      slotsByDay.push({ date, dayOfWeek, slots: daySlots });
    }
  }

  const daysWithSlots = slotsByDay.length;

  if (daysWithSlots === 0) {
    return { slots: [], daysWithSlots: 0 };
  }

  if (daysWithSlots === 1) {
    // Only one day has availability — return first 3 slots
    return {
      slots:         slotsByDay[0].slots.slice(0, 3),
      daysWithSlots: 1,
    };
  }

  // Multiple days — return 1 slot (the first available) per day
  const onePerDay = slotsByDay.map((d) => d.slots[0]);
  return {
    slots:         onePerDay,
    daysWithSlots,
  };
}

// ✅ Slot validation — accepts locationId, managerId, or location name
// Returns:
//   { valid: true,  slot: {...} }                            — slot is free
//   { valid: false, suggestions: [...up to 3 free slots] }  — taken or outside window; same-day alternatives
//   { valid: false, suggestions: [] }                        — no availability on that day at all
export async function validateSlot(input: any) {
  const { locationId, location, date, startTime } = input;

  // ── 1. Resolve location ───────────────────────────────────────────────────
  const locationRecord = await resolveLocation(locationId || location);
  if (!locationRecord) return { valid: false, suggestions: [] };

  // ── 2. Derive day-of-week from date ───────────────────────────────────────
  const dayOfWeek = new Date(`${date}T12:00:00`).toLocaleString('en-US', { weekday: 'long' });

  // ── 3. Fetch active availability windows for this location + day ──────────
  const windows = await prisma.managerAvailability.findMany({
    where: {
      locationId: locationRecord.id,
      dayOfWeek: { equals: dayOfWeek, mode: 'insensitive' },
      active: true,
    },
    include: { manager_rel: true },
  });

  // No windows at all on this day → nothing available
  if (!windows.length) return { valid: false, suggestions: [] };

  // ── 4. Fetch booked appointments for this location on this date ───────────
  const dateStart = new Date(`${date}T00:00:00`);
  const dateEnd   = new Date(`${date}T23:59:59`);

  const booked = await prisma.appointment.findMany({
    where: {
      locationId: locationRecord.id,
      interviewDate: { gte: dateStart, lte: dateEnd },
    },
    include: { manager_rel: true },
  });

  const bookedSet = new Set(
    booked.map((a: any) => {
      const t = normalize12HourTo24Hour(a.startTime);
      return a.manager_rel?.email ? `${a.manager_rel.email}__${t}` : `ANY__${t}`;
    })
  );

  // ── 5. Generate all free slots for this day ───────────────────────────────
  const normalizedRequestedTime = normalize12HourTo24Hour(startTime.trim());

  const allFreeSlots: any[] = [];

  for (const window of windows) {
    const startMins = timeToMinutes(window.startTime);
    const endMins   = timeToMinutes(window.endTime);
    const duration  = parseDuration(window.slotDuration || '15 Min');

    for (let t = startMins; t + duration <= endMins; t += duration) {
      const slotStart   = minutesToTime(t);
      const slotEnd     = minutesToTime(t + duration);
      const managerKey  = `${window.manager_rel!.email}__${slotStart}`;
      const anyKey      = `ANY__${slotStart}`;

      if (!bookedSet.has(managerKey) && !bookedSet.has(anyKey)) {
        allFreeSlots.push({
          date,
          day:          dayOfWeek,
          startTime:    slotStart,
          endTime:      slotEnd,
          displayTime:  formatTo12Hour(slotStart),
          managerName:  window.manager_rel!.name,
          managerEmail: window.manager_rel!.email,
          location:     locationRecord.name,
          locationId:   locationRecord.id,
        });
      }
    }
  }

  // ── 6. Check if the requested slot is among the free slots ───────────────
  const matchedSlot = allFreeSlots.find(s => s.startTime === normalizedRequestedTime);

  if (matchedSlot) {
    return { valid: true, slot: matchedSlot };
  }

  // ── 7. Not available — return up to 3 other free slots as suggestions ─────
  const suggestions = allFreeSlots
    .filter(s => s.startTime !== normalizedRequestedTime)
    .slice(0, 3);

  return { valid: false, suggestions };
}

export async function createAvailability(data: CreateAvailabilityInput) {
  const locationId = await findOrCreateLocation(data.location);
  // Pass locationId so new managers are auto-assigned to this location
  const managerId = await findOrCreateManager(data.managerName, data.managerEmail, [locationId]);

  const availability = await prisma.managerAvailability.create({
    data: {
      locationId,
      managerId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotDuration: data.slotDuration,
      active: data.active,
    },
    include: {
      location_rel: true,
      manager_rel: true,
    },
  });

  return flattenAvailability(availability);
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

  if (data.location) {
    updateData.locationId = await findOrCreateLocation(data.location);
  }

  if (data.managerName && data.managerEmail) {
    updateData.managerId = await findOrCreateManager(data.managerName, data.managerEmail);
  }

  const updated = await prisma.managerAvailability.update({
    where: { id },
    data: updateData,
    include: {
      location_rel: true,
      manager_rel: true,
    },
  });

  return flattenAvailability(updated);
}

export async function deleteAvailability(id: string) {
  const existing = await prisma.managerAvailability.findUnique({ where: { id } });
  if (!existing) throw new Error('NOT_FOUND');

  return prisma.managerAvailability.delete({ where: { id } });
}

// ✅ NEW: Get all managers for dropdown
export async function getAllManagers() {
  const managers = await prisma.user.findMany({
    where: {
      role: { in: ['MANAGER'] },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });
  return managers;
}

// ✅ NEW: Get locations assigned to a specific manager
export async function getManagerLocations(managerId: string) {
  const locations = await prisma.location.findMany({
    where: {
      managerId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return locations;
}

// ✅ NEW: Get all locations
export async function getAllLocations() {
  const locations = await prisma.location.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });
  return locations;
}
