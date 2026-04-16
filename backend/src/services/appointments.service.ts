import { prisma } from "../lib/prisma";
import { CreateAppointmentInput, UpdateAppointmentInput } from "../schemas/appointment.schema";

export class AppointmentService {

  // 🔹 CREATE APPOINTMENT
  static async create(data: CreateAppointmentInput) {
    // 1. Resolve location
    const location = await prisma.location.findFirst({
      where: { name: data.location }
    });

    if (!location) {
      throw new Error("Location not found");
    }

    // 2. Resolve manager (optional)
    let managerId: string | undefined = undefined;

    if (data.managerEmail) {
      const manager = await prisma.user.findFirst({
        where: { email: data.managerEmail }
      });

      managerId = manager?.id;
    }

    // 3. Create appointment
    return prisma.appointment.create({
      data: {
        candidateName: data.candidateName,
        interviewDate: new Date(data.interviewDate),
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration,

        // ✅ FIXED (important)
        locationId: location.id,

        // optional
        managerId: managerId,
      },
      include: {
        location_rel: true,
        manager_rel: true,
      },
    });
  }

  // 🔹 GET ALL APPOINTMENTS
  static async findAll() {
    return prisma.appointment.findMany({
      include: {
        location_rel: true,
        manager_rel: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // 🔹 GET BY ID
  static async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        location_rel: true,
        manager_rel: true,
      },
    });
  }

  // 🔹 UPDATE
  static async update(id: string, data: UpdateAppointmentInput) {
    let locationId: string | undefined;
    let managerId: string | undefined;

    // resolve location if provided
    if (data.location) {
      const location = await prisma.location.findFirst({
        where: { name: data.location },
      });

      if (!location) {
        throw new Error("Location not found");
      }

      locationId = location.id;
    }

    // resolve manager if provided
    if (data.managerEmail) {
      const manager = await prisma.user.findFirst({
        where: { email: data.managerEmail },
      });

      managerId = manager?.id;
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        candidateName: data.candidateName,
        interviewDate: data.interviewDate
          ? new Date(data.interviewDate)
          : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration,

        // ✅ FIXED
        locationId,
        managerId,
      },
      include: {
        location_rel: true,
        manager_rel: true,
      },
    });
  }

  // 🔹 DELETE (soft delete optional)
  static async delete(id: string) {
    return prisma.appointment.delete({
      where: { id },
    });
  }
}
