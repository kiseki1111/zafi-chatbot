import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Marketing Data...');

  // 1. Check existing operator
  let operator = await prisma.user.findFirst({
    where: { userRoles: { some: { role: { name: 'operator' } } } }
  });
  
  if (!operator) {
    operator = await prisma.user.create({
      data: {
        name: 'Agent Dimas',
        email: 'dimas@agent.com',
        password: 'hashedpassword',
      }
    });
    console.log('Created Mock Operator Agent:', operator.name);
  }

  // 2. Create Projects & Units
  const project1 = await prisma.project.create({
    data: {
      name: 'Perumahan Zafi Asri',
      location: 'Jakarta Selatan',
      description: 'Perumahan asri di tengah kota',
      units: {
        create: [
          { unitCode: 'A-01', type: 'Tipe 36', price: 500000000, status: 'AVAILABLE' },
          { unitCode: 'A-02', type: 'Tipe 45', price: 750000000, status: 'RESERVED' },
        ]
      }
    }
  });

  const unit1 = await prisma.unit.findFirst({ where: { projectId: project1.id, unitCode: 'A-02' } });

  // 3. Create Contact
  const contact = await prisma.contact.create({
    data: {
      name: 'Budi Santoso',
      phone: '081234567890',
      email: 'budi@example.com',
      status: 'INTERESTED'
    }
  });

  // 4. Create Booking
  if (unit1) {
    const booking = await prisma.booking.create({
      data: {
        bookingCode: 'BK-0001',
        contactId: contact.id,
        unitId: unit1.id,
        agentId: operator.id,
        totalDp: 50000000,
        paidDp: 25000000,
        status: 'PARTIAL',
      }
    });

    // 5. Create KPR Submission
    await prisma.kprSubmission.create({
      data: {
        bookingId: booking.id,
        bankName: 'Bank BCA',
        status: 'BI_CHECKING',
        submittedAt: new Date()
      }
    });
    console.log('Created Mock Booking & KPR for', contact.name);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
