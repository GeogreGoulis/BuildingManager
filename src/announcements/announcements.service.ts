import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(buildingId: string, createAnnouncementDto: CreateAnnouncementDto, createdBy?: string) {
    // Verify building exists
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        buildingId,
        title: createAnnouncementDto.title,
        content: createAnnouncementDto.content,
        priority: createAnnouncementDto.priority || 'NORMAL',
        isActive: createAnnouncementDto.isActive ?? true,
      },
    });

    // Audit log
    if (createdBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: createdBy,
          action: 'CREATE',
          entity: 'Announcement',
          entityId: announcement.id,
          newValue: { title: announcement.title },
        },
      });
    }

    return announcement;
  }

  async findAll(buildingId: string) {
    if (!buildingId) {
      return [];
    }

    return this.prisma.announcement.findMany({
      where: { buildingId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        comments: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findOne(buildingId: string, id: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, buildingId },
      include: {
        comments: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async update(buildingId: string, id: string, updateAnnouncementDto: UpdateAnnouncementDto, updatedBy?: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, buildingId },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const oldValue = { title: announcement.title, content: announcement.content };

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: updateAnnouncementDto.title,
        content: updateAnnouncementDto.content,
        priority: updateAnnouncementDto.priority,
        isActive: updateAnnouncementDto.isActive,
      },
    });

    // Audit log
    if (updatedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: updatedBy,
          action: 'UPDATE',
          entity: 'Announcement',
          entityId: id,
          oldValue,
          newValue: { title: updated.title, content: updated.content },
        },
      });
    }

    return updated;
  }

  async remove(buildingId: string, id: string, deletedBy?: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, buildingId },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    // Soft delete
    await this.prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    if (deletedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: deletedBy,
          action: 'DELETE',
          entity: 'Announcement',
          entityId: id,
          oldValue: { title: announcement.title },
        },
      });
    }

    return { success: true };
  }
}
