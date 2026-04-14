import { prisma } from '../lib/prisma';
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentQuery,
} from '../schemas/appointment.schema';

export async function listAppointments(query: AppointmentQuery) {
  const { location, date, managerEmail, page, limit } = query;
  const where: Record<string, unknown> = { active: true };

  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (managerEmail) where.managerEmail = { contains: managerEmail, mode: 'insensitive' };
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
  });
  if (!appointment) throw new Error('NOT_FOUND');
  return appointment;
}

export async function createAppointment(data: CreateAppointmentInput) {
  const interviewDate = new Date(data.interviewDate);
  
  // Convert start time to 24-hour format for storage
  const startTime24h = normalize12HourTo24Hour(data.startTime);
  
  // Parse the start time and add 15 minutes to create end time
  const startDateTime = new Date(`${data.interviewDate} ${data.startTime}`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + 15);
  
  // Format end time back to "h:mm AM/PM"
  const endTime = endDateTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });

  return prisma.appointment.create({
    data: {
      ...data,
      interviewDate,
      startTime: startTime24h, // ✅ Store in 24-hour format
      endTime,
    },
  });
}

export async function updateAppointment(id: string, data: UpdateAppointmentInput) {
  const existing = await prisma.appointment.findFirst({ where: { id, active: true } });
  if (!existing) throw new Error('NOT_FOUND');

  const updateData: Record<string, unknown> = { ...data };
  if (data.interviewDate) {
    updateData.interviewDate = new Date(data.interviewDate);
  }

  return prisma.appointment.update({ where: { id }, data: updateData });
}

export async function deleteAppointment(id: string) {
  const existing = await prisma.appointment.findFirst({ where: { id, active: true } });
  if (!existing) throw new Error('NOT_FOUND');

  return prisma.appointment.update({
    where: { id },
    data: { active: false },
  });
}
