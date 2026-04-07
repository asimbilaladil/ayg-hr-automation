import { prisma } from '../lib/prisma';
import {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  SlotsQuery,
  AvailabilityQuery,
} from '../schemas/availability.schema';

const SLOT_DURATION_MINUTES = 20;
const TIMEZONE = 'Europe/Berlin';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

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

export async function getAvailabilitySlots(query: SlotsQuery) {
  const { location, dayOfWeek, date } = query;

  // 1. Get all active availability windows for this location + day
  const windows = await prisma.managerAvailability.findMany({
    where: {
      location: { contains: location, mode: 'insensitive' },
      dayOfWeek: { equals: dayOfWeek, mode: 'insensitive' },
      active: true,
    },
  });

  if (!windows.length) return { slots: [] };

  // 2. Get all booked appointments for this location + date
  const dateStart = new Date(`${date}T00:00:00.000Z`);
  const dateEnd = new Date(`${date}T23:59:59.999Z`);

  const booked = await prisma.appointment.findMany({
    where: {
      location: { contains: location, mode: 'insensitive' },
      interviewDate: { gte: dateStart, lte: dateEnd },
      active: true,
    },
  });

  const bookedSlots = new Set(booked.map((a) => `${a.managerEmail}__${a.startTime}`));

  // 3. Generate free slots
  const slots: Array<{
    date: string;
    day: string;
    startTime: string;
    endTime: string;
    managerName: string;
    managerEmail: string;
    location: string;
  }> = [];

  for (const window of windows) {
    const startMinutes = timeToMinutes(window.startTime);
    const endMinutes = timeToMinutes(window.endTime);

    for (let t = startMinutes; t + SLOT_DURATION_MINUTES <= endMinutes; t += SLOT_DURATION_MINUTES) {
      const slotStart = minutesToTime(t);
      const slotEnd = minutesToTime(t + SLOT_DURATION_MINUTES);
      const key = `${window.managerEmail}__${slotStart}`;

      if (!bookedSlots.has(key)) {
        slots.push({
          date,
          day: dayOfWeek,
          startTime: slotStart,
          endTime: slotEnd,
          managerName: window.managerName,
          managerEmail: window.managerEmail,
          location: window.location,
        });
      }
    }
  }

  return { slots };
}

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
