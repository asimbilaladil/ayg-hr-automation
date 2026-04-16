import { prisma } from '../lib/prisma';
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentQuery,
} from '../schemas/appointment.schema';

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
async function findOrCreateLocation(locationName: string): Promise<string | null> {
  if (!locationName) return null;

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

// Helper to find or create manager by email or name
async function findOrCreateManager(
  managerName?: string,
  managerEmail?: string
): Promise<string | null> {
  if (!managerEmail && !managerName) return null;

  // Try to find by email first
  if (managerEmail) {
    let manager = await prisma.user.findFirst({
      where: {
        email: {
          equals: managerEmail.trim(),
          mode: 'insensitive',
        },
      },
    });

    if (manager) return manager.id;
  }

  // Try to find by name
  if (managerName) {
    let manager = await prisma.user.findFirst({
      where: {
        name: {
          equals: managerName.trim(),
          mode: 'insensitive',
        },
        role: 'MANAGER',
      },
    });

    if (manager) return manager.id;
  }

  // Create new manager if not found
  if (managerName && managerEmail) {
    const manager = await prisma.user.create({
      data: {
        name: managerName.trim(),
        email: managerEmail.trim(),
        role: 'MANAGER',
        passwordHash: null,
        isActive: true,
      },
    });

    return manager.id;
  }

  return null;
}

export async function listAppointments(query: AppointmentQuery) {
  const { location, date, managerEmail, page, limit } = query;
  const where: Record<string, any> = { active: true };

  if (location) {
    const locationRecord = await prisma.location.findFirst({
      where: {
        name: { contains: location, mode: 'insensitive' },
      },
    });
    if (locationRecord) where.locationId = locationRecord.id;
  }

  if (managerEmail) {
    const manager = await prisma.user.findFirst({
      where: {
        email: { contains: managerEmail, mode: 'insensitive' },
      },
    });
    if (manager) where.managerId = manager.id;
  }

  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.interviewDate = { gte: start, lte: end };
  }

  const [data, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        location: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { interviewDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getAppointmentById(id: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, active: true },
    include: {
      location: true,
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
  if (!appointment) throw new Error('NOT_FOUND');
  return appointment;
}

export async function createAppointment(data: CreateAppointmentInput) {
  const interviewDate = new Date(data.interviewDate);

  // Convert start time to 24-hour format for storage
  const startTime24h = normalize12HourTo24Hour(data.startTime);

  // Parse the start time and add duration (default 15 min)
  const startDateTime = new Date(`${data.interviewDate} ${data.startTime}`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + 15);

  // Format end time back to "h:mm AM/PM"
  const endTime = endDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Find or create location
  const locationId = await findOrCreateLocation(data.location);

  // Find or create manager
  const managerId = await findOrCreateManager(data.managerName, data.managerEmail);

  return prisma.appointment.create({
    data: {
      candidateName: data.candidateName,
      jobRole: data.jobRole,
      interviewDate,
      day: data.day,
      startTime: startTime24h, // ✅ Store in 24-hour format
      endTime: data.endTime || endTime,
      slotDuration: data.slotDuration,
      active: true,
      locationId,
      managerId,
    },
    include: {
      location: true,
      manager: {
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

export async function updateAppointment(id: string, data: UpdateAppointmentInput) {
  const existing = await prisma.appointment.findFirst({ where: { id, active: true } });
  if (!existing) throw new Error('NOT_FOUND');

  const updateData: Record<string, any> = {};

  if (data.candidateName) updateData.candidateName = data.candidateName;
  if (data.jobRole !== undefined) updateData.jobRole = data.jobRole;
  if (data.day !== undefined) updateData.day = data.day;
  if (data.startTime) updateData.startTime = data.startTime;
  if (data.endTime) updateData.endTime = data.endTime;
  if (data.slotDuration) updateData.slotDuration = data.slotDuration;
  if (data.active !== undefined) updateData.active = data.active;

  if (data.interviewDate) {
    updateData.interviewDate = new Date(data.interviewDate);
  }

  if (data.location) {
    const locationId = await findOrCreateLocation(data.location);
    updateData.locationId = locationId;
  }

  if (data.managerName || data.managerEmail) {
    const managerId = await findOrCreateManager(data.managerName, data.managerEmail);
    updateData.managerId = managerId;
  }

  return prisma.appointment.update({
    where: { id },
    data: updateData,
    include: {
      location: true,
      manager: {
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

export async function deleteAppointment(id: string) {
  const existing = await prisma.appointment.findFirst({ where: { id, active: true } });
  if (!existing) throw new Error('NOT_FOUND');

  return prisma.appointment.update({
    where: { id },
    data: { active: false },
  });
}
