import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(createExpenseDto: CreateExpenseDto, createdBy?: string) {
    // Verify building exists
    const building = await this.prisma.building.findUnique({
      where: { id: createExpenseDto.buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // Verify category exists
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: createExpenseDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    const expense = await this.prisma.expense.create({
      data: {
        buildingId: createExpenseDto.buildingId!, // buildingId is always provided by controller
        categoryId: createExpenseDto.categoryId,
        supplierId: createExpenseDto.supplierId,
        amount: createExpenseDto.amount,
        description: createExpenseDto.description,
        expenseDate: new Date(createExpenseDto.expenseDate),
        invoiceNumber: createExpenseDto.invoiceNumber,
        isPaid: createExpenseDto.isPaid ?? false,
        paidDate: createExpenseDto.paidDate ? new Date(createExpenseDto.paidDate) : null,
        paymentMethod: createExpenseDto.paymentMethod,
        shareType: createExpenseDto.shareType || 'COMMON',
        isDirectCharge: createExpenseDto.isDirectCharge ?? false,
        chargedApartmentId: createExpenseDto.isDirectCharge && createExpenseDto.chargedApartmentId ? createExpenseDto.chargedApartmentId : null,
        notes: createExpenseDto.notes,
        periodId: createExpenseDto.periodId,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    // Audit log
    if (createdBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: createdBy,
          action: 'CREATE',
          entity: 'Expense',
          entityId: expense.id,
          newValue: { description: expense.description, amount: expense.amount },
        },
      });
    }

    return expense;
  }

  async findAll(buildingId: string, page = 1, limit = 20) {
    // If buildingId is invalid or doesn't exist, return empty result
    if (!buildingId || buildingId === 'demo-building-id') {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    // Verify building exists
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: { buildingId },
        include: {
          category: true,
          supplier: true,
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where: { buildingId } }),
    ]);

    return {
      data: expenses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(buildingId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, buildingId },
      include: {
        category: true,
        supplier: true,
        building: true,
        documents: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(buildingId: string, id: string, updateExpenseDto: UpdateExpenseDto, updatedBy?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, buildingId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const oldValue = { ...expense };

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        categoryId: updateExpenseDto.categoryId,
        supplierId: updateExpenseDto.supplierId,
        amount: updateExpenseDto.amount,
        description: updateExpenseDto.description,
        expenseDate: updateExpenseDto.expenseDate ? new Date(updateExpenseDto.expenseDate) : undefined,
        invoiceNumber: updateExpenseDto.invoiceNumber,
        isPaid: updateExpenseDto.isPaid,
        paidDate: updateExpenseDto.paidDate ? new Date(updateExpenseDto.paidDate) : undefined,
        paymentMethod: updateExpenseDto.paymentMethod,
        shareType: updateExpenseDto.shareType,
        isDirectCharge: updateExpenseDto.isDirectCharge ?? undefined,
        chargedApartmentId: updateExpenseDto.isDirectCharge && updateExpenseDto.chargedApartmentId ? updateExpenseDto.chargedApartmentId : (updateExpenseDto.isDirectCharge === false ? null : undefined),
        notes: updateExpenseDto.notes,
        periodId: updateExpenseDto.periodId,
      },
      include: {
        category: true,
        supplier: true,
      },
    });

    // Audit log
    if (updatedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: updatedBy,
          action: 'UPDATE',
          entity: 'Expense',
          entityId: id,
          oldValue: { description: oldValue.description, amount: oldValue.amount },
          newValue: { description: updated.description, amount: updated.amount },
        },
      });
    }

    return updated;
  }

  async remove(buildingId: string, id: string, deletedBy?: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, buildingId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    // Soft delete
    await this.prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    if (deletedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: deletedBy,
          action: 'DELETE',
          entity: 'Expense',
          entityId: id,
          oldValue: { description: expense.description, amount: expense.amount },
        },
      });
    }

    return { message: 'Expense deleted successfully' };
  }

  async getCategories() {
    return this.prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
