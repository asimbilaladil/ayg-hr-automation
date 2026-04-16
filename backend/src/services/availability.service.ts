import { prisma } from '../lib/prisma';
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

async function findOrCreateManager(managerName: string, managerEmail: string): Promise<string> {
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
  }

  return manager.id;
}

export async function listAvailability(query: AvailabilityQuery) {
  const where: Record<string, any> = {};

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

export async function getAvailabilitySlots(query: SlotsQuery & { limit?: number }) {
  const { location, dayOfWeek, date, limit } = query;

  const locationRecord = await prisma.location.findFirst({
    where: { name: { contains: location, mode: 'insensitive' } },
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
      manager_rel: true,
    },
  });

  if (!windows.length) return { slots: [] };

  const dateStart = new Date(`${date}T00:00:00`);
  const dateEnd = new Date(`${date}T23:59:59`);

  const booked = await prisma.appointment.findMany({
    where: {
      locationId: locationRecord.id,
      interviewDate: { gte: dateStart, lte: dateEnd },
    },
    include: {
      manager_rel: true,
    },
  });

  const bookedSlots = new Set(
    booked.map((a) => {
      const normalizedTime = normalize12HourTo24Hour(a.startTime);
      return a.manager_rel?.email
        ? `${a.manager_rel.email}__${normalizedTime}`
        : `ANY__${normalizedTime}`;
    })
  );

  const slots: any[] = [];

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
      }
    }
  }

  return {
    slots: limit ? slots.slice(0, limit) : slots,
  };
}

// ✅ alias for controller
export const getSuggestedSlots = getAvailabilitySlots;

// ✅ simple validation
export async function validateSlot(input: any) {
  const { location, date, startTime } = input;

  const locationRecord = await prisma.location.findFirst({
    where: { name: { contains: location, mode: 'insensitive' } },
  });

  if (!locationRecord) return { valid: false };

  const existing = await prisma.appointment.findFirst({
    where: {
      locationId: locationRecord.id,
      interviewDate: new Date(date),
      startTime,
    },
  });

  return { valid: !existing };
}

export async function createAvailability(data: CreateAvailabilityInput) {
  const locationId = await findOrCreateLocation(data.location);
  const managerId = await findOrCreateManager(data.managerName, data.managerEmail);

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

// ✅ NEW: Get locations for a specific manager
// Returns locations where manager already has availability,
// falls back to ALL locations if none exist yet
export async function getManagerLocations(managerId: string) {
  // First, try to get locations where this manager already has availability
  const existingLocations = await prisma.managerAvailability.findMany({
    where: {
      managerId,
    },
    select: {
      locationId: true,
      location_rel: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    distinct: ['locationId'],
  });

  // Extract unique locations
  const uniqueLocations = Array.from(
    new Map(existingLocations.map(l => [l.locationId, l.location_rel])).values()
  );

  // If manager has existing availability, return those locations
  if (uniqueLocations.length > 0) {
    return uniqueLocations;
  }

  // Otherwise, return ALL active locations so manager can add availability anywhere
  const allLocations = await prisma.location.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return allLocations;
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
