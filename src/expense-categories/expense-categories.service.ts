import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateExpenseCategoryDto) {
    // Check if category with same name exists
    const existing = await this.prisma.expenseCategory.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    return this.prisma.expenseCategory.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        isActive: true,
      },
    });
  }

  async findAll() {
    return this.prisma.expenseCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    return category;
  }

  async update(id: string, updateDto: UpdateExpenseCategoryDto) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    // Check if name is being changed to an existing name
    if (updateDto.name && updateDto.name !== category.name) {
      const existing = await this.prisma.expenseCategory.findUnique({
        where: { name: updateDto.name },
      });

      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
      },
    });
  }

  async remove(id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    // Soft delete
    await this.prisma.expenseCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Expense category deleted successfully' };
  }
}
