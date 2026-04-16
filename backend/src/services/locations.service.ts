import { prisma } from '../lib/prisma';
import {
  CreateLocationInput,
  UpdateLocationInput,
} from '../schemas/location.schema';

export async function listLocations() {
  return prisma.location.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          candidates: true,
          managerAvailabilities: true,
          appointments: true,
        },
      },
    },
  });
}

export async function getLocationById(id: string) {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          candidates: true,
          managerAvailabilities: true,
          appointments: true,
        },
      },
    },
  });
  if (!location) throw new Error('NOT_FOUND');
  return location;
}

export async function createLocation(data: CreateLocationInput) {
  // Check if location with this name already exists
  const existing = await prisma.location.findFirst({
    where: {
      name: {
        equals: data.name,
        mode: 'insensitive',
      },
    },
  });

  if (existing) {
    throw new Error('DUPLICATE_LOCATION');
  }

  return prisma.location.create({
    data: {
      name: data.name,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateLocation(id: string, data: UpdateLocationInput) {
  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) throw new Error('NOT_FOUND');

  // If updating name, check for duplicates
  if (data.name) {
    const existing = await prisma.location.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
        id: { not: id },
      },
    });

    if (existing) {
      throw new Error('DUPLICATE_LOCATION');
    }
  }

  return prisma.location.update({
    where: { id },
    data,
  });
}

export async function deleteLocation(id: string) {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          candidates: true,
          managerAvailabilities: true,
          appointments: true,
        },
      },
    },
  });

  if (!location) throw new Error('NOT_FOUND');

  // Check if location is being used
  if (
    location._count.candidates > 0 ||
    location._count.managerAvailabilities > 0 ||
    location._count.appointments > 0
  ) {
    throw new Error('LOCATION_IN_USE');
  }

  return prisma.location.delete({
    where: { id },
  });
}
