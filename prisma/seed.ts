import { PrismaClient, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Roles with RoleType enum
  const superAdminRole = await prisma.role.upsert({
    where: { name: RoleType.SUPER_ADMIN },
    update: {},
    create: {
      name: RoleType.SUPER_ADMIN,
      description: 'Full system access across all buildings',
    },
  });

  const buildingAdminRole = await prisma.role.upsert({
    where: { name: RoleType.BUILDING_ADMIN },
    update: {},
    create: {
      name: RoleType.BUILDING_ADMIN,
      description: 'Full access to assigned building',
    },
  });

  const readOnlyRole = await prisma.role.upsert({
    where: { name: RoleType.READ_ONLY },
    update: {},
    create: {
      name: RoleType.READ_ONLY,
      description: 'Read-only access to assigned building',
    },
  });

  console.log('✅ Roles created');

  // Create Super Admin User
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@buildingmanager.com' },
    update: {},
    create: {
      email: 'admin@buildingmanager.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+306912345678',
      isActive: true,
    },
  });

  // Assign Super Admin Role
  const existingRole = await prisma.userRole.findFirst({
    where: {
      userId: superAdmin.id,
      roleId: superAdminRole.id,
      buildingId: null,
    },
  });

  if (!existingRole) {
    await prisma.userRole.create({
      data: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
        buildingId: null,
      },
    });
  }

  console.log('✅ Super Admin user created');

  // Create Expense Categories
  const categories = [
    { name: 'MAINTENANCE', description: 'Συντήρηση κτιρίου' },
    { name: 'CLEANING', description: 'Καθαριότητα' },
    { name: 'ELECTRICITY', description: 'Ηλεκτρικό ρεύμα κοινόχρηστων' },
    { name: 'WATER', description: 'Ύδρευση' },
    { name: 'ELEVATOR', description: 'Ανελκυστήρας' },
    { name: 'INSURANCE', description: 'Ασφάλιστρα' },
    { name: 'OIL', description: 'Πετρέλαιο θέρμανσης' },
    { name: 'SECURITY', description: 'Φύλαξη' },
    { name: 'GARDENING', description: 'Κηπουρική' },
    { name: 'OTHER', description: 'Άλλα έξοδα' },
  ];

  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('✅ Expense categories created');

  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📧 Super Admin credentials:');
  console.log('   Email: admin@buildingmanager.com');
  console.log('   Password: Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
