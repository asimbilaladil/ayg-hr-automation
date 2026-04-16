import { prisma } from "../lib/prisma";
import { CreateAppointmentInput, UpdateAppointmentInput } from "../schemas/appointment.schema";

export class AppointmentService {

  static async create(data: any) {
    const candidate = await prisma.candidate.findFirst({
      where: { emailId: data.emailId }
    });

    if (!candidate) throw new Error("Candidate not found");

    const location = await prisma.location.findFirst({
      where: { name: data.location }
    });

    if (!location) throw new Error("Location not found");

    let managerId: string | undefined;

    if (data.managerEmail) {
      const manager = await prisma.user.findFirst({
        where: { email: data.managerEmail }
      });
      managerId = manager?.id;
    }

    await prisma.appointment.deleteMany({
      where: { candidateId: candidate.id }
    });

    return prisma.appointment.create({
      data: {
        candidateId: candidate.id,
        locationId: location.id,
        managerId,
        interviewDate: new Date(data.interviewDate),
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration
      },
      include: {
        candidate_rel: true,
        location_rel: true,
        manager_rel: true
      }
    });
  }

  static async findAll() {
    return prisma.appointment.findMany({
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
export const listAppointments = AppointmentService.findAll;
export const getAppointmentById = AppointmentService.findById;
export const createAppointment = AppointmentService.create;
export const updateAppointment = AppointmentService.update;
export const deleteAppointment = AppointmentService.delete;
