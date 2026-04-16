const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Step 1: Create Locations
    console.log('1️⃣  Creating locations from candidates...');
    const candidatesWithLocation = await prisma.$queryRaw`
      SELECT DISTINCT TRIM(location) as location 
      FROM "Candidate" 
      WHERE location IS NOT NULL 
      AND location != '' 
      AND "deletedAt" IS NULL
    `;

    const locationMap = new Map();

    for (const { location } of candidatesWithLocation) {
      if (!location) continue;

      const trimmedLocation = location.trim();

      let locationRecord = await prisma.location.findFirst({
        where: {
          name: {
            equals: trimmedLocation,
            mode: 'insensitive',
          },
        },
      });

      if (!locationRecord) {
        locationRecord = await prisma.location.create({
          data: {
            name: trimmedLocation,
            isActive: true,
          },
        });
        console.log(`   ✓ Created location: ${trimmedLocation}`);
      } else {
        console.log(`   ℹ Location already exists: ${trimmedLocation}`);
      }

      locationMap.set(trimmedLocation.toLowerCase(), locationRecord.id);
    }

    console.log(`   📊 Total locations: ${locationMap.size}\n`);

    // Step 2: Create Managers
    console.log('2️⃣  Creating hiring managers...');
    const candidatesWithManager = await prisma.$queryRaw`
      SELECT DISTINCT TRIM("hiringManager") as "hiringManager"
      FROM "Candidate" 
      WHERE "hiringManager" IS NOT NULL 
      AND "hiringManager" != ''
      AND "deletedAt" IS NULL
    `;

    const managerMap = new Map();

    for (const { hiringManager } of candidatesWithManager) {
      if (!hiringManager) continue;

      const trimmedName = hiringManager.trim();

      let managerRecord = await prisma.user.findFirst({
        where: {
          name: {
            equals: trimmedName,
            mode: 'insensitive',
          },
          role: 'MANAGER',
        },
      });

      if (!managerRecord) {
        const tempEmail = `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@temp.placeholder`;

        const emailExists = await prisma.user.findUnique({
          where: { email: tempEmail },
        });

        if (!emailExists) {
          managerRecord = await prisma.user.create({
            data: {
              name: trimmedName,
              email: tempEmail,
              role: 'MANAGER',
              passwordHash: null,
              isActive: true,
            },
          });
          console.log(`   ✓ Created manager: ${trimmedName} (${tempEmail})`);
        } else {
          managerRecord = emailExists;
        }
      } else {
        console.log(`   ℹ Manager already exists: ${trimmedName}`);
      }

      managerMap.set(trimmedName.toLowerCase(), managerRecord.id);
    }

    console.log(`   📊 Total managers: ${managerMap.size}\n`);

    // Step 3: Create Recruiters
    console.log('3️⃣  Creating recruiters...');
    const candidatesWithRecruiter = await prisma.$queryRaw`
      SELECT DISTINCT TRIM(recruiter) as recruiter
      FROM "Candidate" 
      WHERE recruiter IS NOT NULL 
      AND recruiter != ''
      AND "deletedAt" IS NULL
    `;

    const recruiterMap = new Map();

    for (const { recruiter } of candidatesWithRecruiter) {
      if (!recruiter) continue;

      const trimmedName = recruiter.trim();

      let recruiterRecord = await prisma.user.findFirst({
        where: {
          name: {
            equals: trimmedName,
            mode: 'insensitive',
          },
        },
      });

      if (!recruiterRecord) {
        const tempEmail = `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@temp.placeholder`;

        const emailExists = await prisma.user.findUnique({
          where: { email: tempEmail },
        });

        if (!emailExists) {
          recruiterRecord = await prisma.user.create({
            data: {
              name: trimmedName,
              email: tempEmail,
              role: 'HR',
              passwordHash: null,
              isActive: true,
            },
          });
          console.log(`   ✓ Created recruiter: ${trimmedName} (${tempEmail})`);
        } else {
          recruiterRecord = emailExists;
        }
      } else {
        console.log(`   ℹ Recruiter already exists: ${trimmedName}`);
      }

      recruiterMap.set(trimmedName.toLowerCase(), recruiterRecord.id);
    }

    console.log(`   📊 Total recruiters: ${recruiterMap.size}\n`);

    // Step 4: Update candidates
    console.log('4️⃣  Updating candidates with foreign keys...');
    const allCandidates = await prisma.candidate.findMany({
      where: { deletedAt: null },
    });

    let candidatesUpdated = 0;
    for (const candidate of allCandidates) {
      const updateData = {};

      if (candidate.location) {
        const locationId = locationMap.get(candidate.location.trim().toLowerCase());
        if (locationId) updateData.locationId = locationId;
      }

      if (candidate.hiringManager) {
        const managerId = managerMap.get(candidate.hiringManager.trim().toLowerCase());
        if (managerId) updateData.hiringManagerId = managerId;
      }

      if (candidate.recruiter) {
        const recruiterId = recruiterMap.get(candidate.recruiter.trim().toLowerCase());
        if (recruiterId) updateData.recruiterId = recruiterId;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.candidate.update({
          where: { id: candidate.id },
          data: updateData,
        });
        candidatesUpdated++;
      }
    }
    console.log(`   ✓ Updated ${candidatesUpdated} candidates\n`);

    // Step 5: Update ManagerAvailability
    console.log('5️⃣  Migrating manager availabilities...');
    const availabilities = await prisma.managerAvailability.findMany();

    let availabilitiesUpdated = 0;
    for (const availability of availabilities) {
      const updateData = {};

      if (availability.location) {
        const locationId = locationMap.get(availability.location.trim().toLowerCase());
        if (locationId) updateData.locationId = locationId;
      }

      if (availability.managerName) {
        let managerId = managerMap.get(availability.managerName.trim().toLowerCase());

        if (!managerId && availability.managerEmail) {
          const manager = await prisma.user.findFirst({
            where: {
              email: {
                equals: availability.managerEmail,
                mode: 'insensitive',
              },
            },
          });
          if (manager) managerId = manager.id;
        }

        if (managerId) updateData.managerId = managerId;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.managerAvailability.update({
          where: { id: availability.id },
          data: updateData,
        });
        availabilitiesUpdated++;
      }
    }
    console.log(`   ✓ Updated ${availabilitiesUpdated} availabilities\n`);

    // Step 6: Update Appointments
    console.log('6️⃣  Migrating appointments...');
    const appointments = await prisma.appointment.findMany();

    let appointmentsUpdated = 0;
    for (const appointment of appointments) {
      const updateData = {};

      if (appointment.location) {
        const locationId = locationMap.get(appointment.location.trim().toLowerCase());
        if (locationId) updateData.locationId = locationId;
      }

      if (appointment.managerName) {
        let managerId = managerMap.get(appointment.managerName.trim().toLowerCase());

        if (!managerId && appointment.managerEmail) {
          const manager = await prisma.user.findFirst({
            where: {
              email: {
                equals: appointment.managerEmail,
                mode: 'insensitive',
              },
            },
          });
          if (manager) managerId = manager.id;
        }

        if (managerId) updateData.managerId = managerId;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: updateData,
        });
        appointmentsUpdated++;
      }
    }
    console.log(`   ✓ Updated ${appointmentsUpdated} appointments\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • ${locationMap.size} locations`);
    console.log(`   • ${managerMap.size} managers`);
    console.log(`   • ${recruiterMap.size} recruiters`);
    console.log(`   • ${candidatesUpdated} candidates updated`);
    console.log(`   • ${availabilitiesUpdated} availabilities updated`);
    console.log(`   • ${appointmentsUpdated} appointments updated\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('Migration script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
