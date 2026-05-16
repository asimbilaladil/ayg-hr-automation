import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

type Role = 'ADMIN' | 'HR' | 'MANAGER';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      locations: { select: { id: true, name: true } },
    },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });
  if (!user) throw new Error('NOT_FOUND');
  return user;
}

export async function updateUserRole(id: string, role: Role) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  return prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

export async function updateUserEmail(id: string, email: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  // Check new email is not already taken by another user
  const existing = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), id: { not: id } },
  });
  if (existing) throw new Error('EMAIL_TAKEN');

  return prisma.user.update({
    where: { id },
    data: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

/** Self-service password change — verifies currentPassword before updating. */
export async function changeUserPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');
  if (!user.passwordHash) throw new Error('NO_PASSWORD');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('WRONG_PASSWORD');

  if (newPassword.length < 8) throw new Error('TOO_SHORT');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

/** Generates a random temporary password, hashes + stores it, and returns it in plaintext
 *  so an admin can share it with the user via another channel. */
export async function resetUserPassword(id: string): Promise<{ tempPassword: string }> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  // Generate a readable 12-char temp password: letters + digits
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let tempPassword = '';
  for (let i = 0; i < 12; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return { tempPassword };
}

export async function createUser(data: {
  name: string;
  email: string;
  role: Role;
  locationName?: string;
}): Promise<{ user: any; tempPassword: string; location?: any }> {
  const existing = await prisma.user.findFirst({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new Error('EMAIL_TAKEN');

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let tempPassword = '';
  for (let i = 0; i < 12; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      role: data.role,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  });

  let location;
  if (data.role === 'MANAGER' && data.locationName?.trim()) {
    location = await prisma.location.create({
      data: {
        name: data.locationName.trim(),
        isActive: true,
        managerId: user.id,
      },
    });
  }

  return { user, tempPassword, location };
}

export async function getSwapPreview(managerAId: string, managerBId: string) {
  if (managerAId === managerBId) throw new Error('SAME_MANAGER');

  const [managerA, managerB] = await Promise.all([
    prisma.user.findUnique({ where: { id: managerAId }, include: { locations: true } }),
    prisma.user.findUnique({ where: { id: managerBId }, include: { locations: true } }),
  ]);

  if (!managerA) throw new Error('MANAGER_A_NOT_FOUND');
  if (!managerB) throw new Error('MANAGER_B_NOT_FOUND');

  const locationA = managerA.locations[0];
  const locationB = managerB.locations[0];

  if (!locationA) throw new Error('MANAGER_A_NO_LOCATION');
  if (!locationB) throw new Error('MANAGER_B_NO_LOCATION');

  const [candA, apptA, availA, candB, apptB, availB] = await Promise.all([
    prisma.candidate.count({ where: { locationId: locationA.id, hiringManagerId: managerAId } }),
    prisma.appointment.count({ where: { locationId: locationA.id, managerId: managerAId } }),
    prisma.managerAvailability.count({ where: { locationId: locationA.id, managerId: managerAId } }),
    prisma.candidate.count({ where: { locationId: locationB.id, hiringManagerId: managerBId } }),
    prisma.appointment.count({ where: { locationId: locationB.id, managerId: managerBId } }),
    prisma.managerAvailability.count({ where: { locationId: locationB.id, managerId: managerBId } }),
  ]);

  return {
    managerA: { id: managerA.id, name: managerA.name, location: { id: locationA.id, name: locationA.name } },
    managerB: { id: managerB.id, name: managerB.name, location: { id: locationB.id, name: locationB.name } },
    transferToB: { candidates: candA, appointments: apptA, availabilityWindows: availA },
    transferToA: { candidates: candB, appointments: apptB, availabilityWindows: availB },
  };
}

export async function swapManagerLocations(managerAId: string, managerBId: string) {
  if (managerAId === managerBId) throw new Error('SAME_MANAGER');

  const [managerA, managerB] = await Promise.all([
    prisma.user.findUnique({ where: { id: managerAId }, include: { locations: true } }),
    prisma.user.findUnique({ where: { id: managerBId }, include: { locations: true } }),
  ]);

  if (!managerA) throw new Error('MANAGER_A_NOT_FOUND');
  if (!managerB) throw new Error('MANAGER_B_NOT_FOUND');

  const locationA = managerA.locations[0];
  const locationB = managerB.locations[0];

  if (!locationA) throw new Error('MANAGER_A_NO_LOCATION');
  if (!locationB) throw new Error('MANAGER_B_NO_LOCATION');

  await prisma.$transaction([
    // Swap location ownership
    prisma.location.update({ where: { id: locationA.id }, data: { managerId: managerBId } }),
    prisma.location.update({ where: { id: locationB.id }, data: { managerId: managerAId } }),
    // Transfer locationA records: A → B
    prisma.candidate.updateMany({ where: { locationId: locationA.id, hiringManagerId: managerAId }, data: { hiringManagerId: managerBId } }),
    prisma.appointment.updateMany({ where: { locationId: locationA.id, managerId: managerAId }, data: { managerId: managerBId } }),
    prisma.managerAvailability.updateMany({ where: { locationId: locationA.id, managerId: managerAId }, data: { managerId: managerBId } }),
    // Transfer locationB records: B → A
    prisma.candidate.updateMany({ where: { locationId: locationB.id, hiringManagerId: managerBId }, data: { hiringManagerId: managerAId } }),
    prisma.appointment.updateMany({ where: { locationId: locationB.id, managerId: managerBId }, data: { managerId: managerAId } }),
    prisma.managerAvailability.updateMany({ where: { locationId: locationB.id, managerId: managerBId }, data: { managerId: managerAId } }),
  ]);

  return {
    success: true,
    managerA: { name: managerA.name, newLocation: locationB.name },
    managerB: { name: managerB.name, newLocation: locationA.name },
  };
}

export async function listLocations() {
  return prisma.location.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      isActive: true,
      managerId: true,
      manager: { select: { id: true, name: true } },
    },
  });
}

export async function assignLocation(
  managerId: string,
  options: { locationName?: string; locationId?: string },
) {
  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    include: { locations: true },
  });
  if (!manager) throw new Error('MANAGER_NOT_FOUND');
  if (manager.locations.length > 0) throw new Error('MANAGER_HAS_LOCATION');

  if (options.locationName) {
    const location = await prisma.location.create({
      data: { name: options.locationName.trim(), isActive: true, managerId },
    });
    return { location, transferred: null };
  }

  if (options.locationId) {
    const location = await prisma.location.findUnique({
      where: { id: options.locationId },
      include: { manager: { select: { id: true, name: true } } },
    });
    if (!location) throw new Error('LOCATION_NOT_FOUND');

    const oldManagerId = location.managerId;
    const ops: any[] = [
      prisma.location.update({ where: { id: location.id }, data: { managerId } }),
    ];

    // Transfer candidates/appointments that belonged to the old manager OR were left unmanaged
    // (e.g. after a previous manager was deleted). Availability windows only transfer if there
    // was an explicit old manager — unmanaged windows don't exist.
    ops.push(
      prisma.candidate.updateMany({
        where: {
          locationId: location.id,
          OR: [{ hiringManagerId: oldManagerId }, { hiringManagerId: null }],
        },
        data: { hiringManagerId: managerId },
      }),
      prisma.appointment.updateMany({
        where: {
          locationId: location.id,
          OR: [{ managerId: oldManagerId }, { managerId: null }],
        },
        data: { managerId },
      }),
    );
    if (oldManagerId) {
      ops.push(
        prisma.managerAvailability.updateMany({
          where: { locationId: location.id, managerId: oldManagerId },
          data: { managerId },
        }),
      );
    }

    const previousManager = location.manager;
    await prisma.$transaction(ops);
    const updated = await prisma.location.findUnique({
      where: { id: location.id },
      include: { manager: { select: { id: true, name: true } } },
    });
    return { location: updated, transferred: true, previousManager };
  }

  throw new Error('NO_LOCATION_OPTION');
}

export async function deactivateUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('NOT_FOUND');

  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

export async function deleteManager(id: string) {
  const manager = await prisma.user.findUnique({
    where: { id },
    include: { locations: true },
  });
  if (!manager) throw new Error('NOT_FOUND');
  if (manager.role !== 'MANAGER') throw new Error('NOT_MANAGER');

  const location = manager.locations[0] || null;

  const candidateCount = await prisma.candidate.count({ where: { hiringManagerId: id } });

  await prisma.$transaction([
    prisma.candidate.updateMany({ where: { hiringManagerId: id }, data: { hiringManagerId: null } }),
    prisma.appointment.updateMany({ where: { managerId: id }, data: { managerId: null } }),
    prisma.managerAvailability.deleteMany({ where: { managerId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return {
    success: true,
    locationUnlinked: location?.name || null,
    candidatesUnlinked: candidateCount,
  };
}
