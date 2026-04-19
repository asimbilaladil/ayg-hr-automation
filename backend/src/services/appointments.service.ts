import { prisma } from "../lib/prisma";
import { CreateAppointmentInput, UpdateAppointmentInput } from "../schemas/appointment.schema";

export class AppointmentService {

  static async create(data: any) {
    const { candidateId, locationId, interviewDate, interviewTime, postingId } = data;

    // ── 1. Validate candidate exists ────────────────────────────────────────
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);

    // ── 2. Validate location exists ─────────────────────────────────────────
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) throw new Error(`Location not found: ${locationId}`);

    // ── 3. Convert 12-hour interviewTime → 24-hour startTime ────────────────
    function to24Hour(time12: string): string {
      const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!match) throw new Error(`Invalid interviewTime format: "${time12}". Expected e.g. "9:00 AM"`);
      let [, h, m, period] = match;
      let hour = parseInt(h, 10);
      if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return `${String(hour).padStart(2, '0')}:${m}`;
    }

    const startTime = to24Hour(interviewTime);

    // ── 4. Look up the matching availability window ──────────────────────────
    //    Purpose: get managerId + slotDuration + calculate endTime
    const dayOfWeek = new Date(`${interviewDate}T12:00:00`).toLocaleString('en-US', { weekday: 'long' });

    const window = await prisma.managerAvailability.findFirst({
      where: {
        locationId,
        dayOfWeek: { equals: dayOfWeek, mode: 'insensitive' },
        active: true,
      },
      orderBy: { startTime: 'asc' },
    });

    // managerId: prefer from matching window, fall back to location's assigned manager
    const managerId: string | undefined =
      window?.managerId ?? location.managerId ?? undefined;

    // slotDuration from window, defaulting to "15 Min"
    const slotDuration = window?.slotDuration ?? '15 Min';

    // Calculate endTime by adding slot duration to startTime
    function timeToMins(t: string) {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    }
    function minsToTime(mins: number) {
      return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }
    function parseDuration(dur: string) {
      const match = dur.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 15;
    }

    const durationMins = parseDuration(slotDuration);
    const endTime = minsToTime(timeToMins(startTime) + durationMins);

    // ── 5. Replace any existing appointment for this candidate ───────────────
    await prisma.appointment.deleteMany({ where: { candidateId: candidate.id } });

    // ── 6. Create the appointment ────────────────────────────────────────────
    const appointment = await prisma.appointment.create({
      data: {
        candidateId: candidate.id,
        locationId,
        managerId,
        interviewDate: new Date(`${interviewDate}T12:00:00`),
        startTime,
        endTime,
        slotDuration,
      },
      include: {
        candidate_rel: true,
        location_rel: true,
        manager_rel: true,
      },
    });

    // ── 7. Update candidate: status → scheduled, postingId if provided ───────
    await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        status: 'scheduled',
        ...(postingId && { postingId }),
      },
    });

    return appointment;
  }

  static async findAll(scopedManagerId?: string) {
    return prisma.appointment.findMany({
      where: scopedManagerId ? { managerId: scopedManagerId } : undefined,
      include: {
        candidate_rel: true,
        location_rel: true,
        manager_rel: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        candidate_rel: true,
        location_rel: true,
        manager_rel: true
      }
    });
  }

  static async update(id: string, data: any) {
    let locationId: string | undefined;
    let managerId: string | undefined;

    if (data.location) {
      const location = await prisma.location.findFirst({ where: { name: data.location } });
      if (!location) throw new Error("Location not found");
      locationId = location.id;
    }

    if (data.managerEmail) {
      const manager = await prisma.user.findFirst({ where: { email: data.managerEmail } });
      managerId = manager?.id;
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        interviewDate: data.interviewDate ? new Date(data.interviewDate) : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration,
        locationId,
        managerId
      },
      include: {
        candidate_rel: true,
        location_rel: true,
        manager_rel: true
      }
    });
  }

  static async delete(id: string) {
    return prisma.appointment.delete({ where: { id } });
  }
}

// backward compatibility for controllers
export const listAppointments = (scopedManagerId?: string) => AppointmentService.findAll(scopedManagerId);
export const getAppointmentById = AppointmentService.findById;
export const createAppointment = AppointmentService.create;
export const updateAppointment = AppointmentService.update;
export const deleteAppointment = AppointmentService.delete;
