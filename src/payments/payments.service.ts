import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(buildingId: string, createPaymentDto: CreatePaymentDto, createdBy?: string) {
    // Verify apartment exists and belongs to building
    const apartment = await this.prisma.apartment.findFirst({
      where: { 
        id: createPaymentDto.apartmentId,
        buildingId,
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found in this building');
    }

    const payment = await this.prisma.payment.create({
      data: {
        apartmentId: createPaymentDto.apartmentId,
        userId: createdBy,
        amount: createPaymentDto.amount,
        paymentDate: new Date(createPaymentDto.paymentDate),
        paymentMethod: createPaymentDto.paymentMethod,
        reference: createPaymentDto.reference,
        notes: createPaymentDto.notes,
      },
      include: {
        apartment: true,
      },
    });

    // Audit log
    if (createdBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: createdBy,
          action: 'CREATE',
          entity: 'Payment',
          entityId: payment.id,
          newValue: { amount: payment.amount, apartmentId: payment.apartmentId },
        },
      });
    }

    return payment;
  }

  async findAll(buildingId: string, page = 1, limit = 20) {
    if (!buildingId) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          apartment: { buildingId },
        },
        include: {
          apartment: true,
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({
        where: {
          apartment: { buildingId },
        },
      }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(buildingId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        apartment: { buildingId },
      },
      include: {
        apartment: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async update(buildingId: string, id: string, updatePaymentDto: UpdatePaymentDto, updatedBy?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        apartment: { buildingId },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const oldValue = { ...payment };

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        amount: updatePaymentDto.amount,
        paymentDate: updatePaymentDto.paymentDate ? new Date(updatePaymentDto.paymentDate) : undefined,
        paymentMethod: updatePaymentDto.paymentMethod,
        reference: updatePaymentDto.reference,
        notes: updatePaymentDto.notes,
      },
      include: {
        apartment: true,
      },
    });

    // Audit log
    if (updatedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: updatedBy,
          action: 'UPDATE',
          entity: 'Payment',
          entityId: id,
          oldValue,
          newValue: { amount: updated.amount },
        },
      });
    }

    return updated;
  }

  async remove(buildingId: string, id: string, deletedBy?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        apartment: { buildingId },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Soft delete
    await this.prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    if (deletedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: deletedBy,
          action: 'DELETE',
          entity: 'Payment',
          entityId: id,
          oldValue: { amount: payment.amount, apartmentId: payment.apartmentId },
        },
      });
    }

    return { success: true };
  }
}
