import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BuildingsModule } from './buildings/buildings.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { OilManagementModule } from './oil-management/oil-management.module';
import { CommonChargesModule } from './common-charges/common-charges.module';
import { DocumentsModule } from './documents/documents.module';
import { PaymentsModule } from './payments/payments.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { PrintModule } from './print/print.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BuildingsModule,
    ExpensesModule,
    ExpenseCategoriesModule,
    OilManagementModule,
    CommonChargesModule,
    DocumentsModule,
    PaymentsModule,
    AnnouncementsModule,
    AuditLogModule,
    PrintModule,
  ],
})
export class AppModule {}
