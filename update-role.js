const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'dertus85@gmail.com'; // user's email from screenshot

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('User not found!');
    return;
  }

  // Get marketing division (capitalized based on previous query)
  const division = await prisma.division.findFirst({ where: { name: 'Marketing' } });
  if (!division) {
    console.log('Marketing division not found in DB!');
    return;
  }

  // Update user division
  await prisma.user.update({
    where: { email },
    data: { divisionId: division.id }
  });

  // Ensure role is operator
  const role = await prisma.role.findUnique({ where: { name: 'operator' } });
  if (role) {
    const existingRole = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId: role.id }
    });
    if (!existingRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: role.id }
      });
    }
  }

  console.log(`Successfully updated ${email} to Operator - Marketing!`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
