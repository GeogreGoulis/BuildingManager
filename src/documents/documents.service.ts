import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async upload(
    buildingId: string,
    file: Express.Multer.File | undefined,
    createDocumentDto: CreateDocumentDto,
    uploadedBy?: string,
  ) {
    // Verify building exists
    const building = await this.prisma.building.findUnique({
      where: { id: buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // Create document record
    // Note: In production, you'd store the file in S3, Azure Blob, or local storage
    const document = await this.prisma.document.create({
      data: {
        buildingId,
        name: createDocumentDto.title || file?.originalname || 'Untitled',
        filename: file?.originalname || 'unknown',
        mimeType: file?.mimetype || 'application/octet-stream',
        size: file?.size || 0,
        path: `/uploads/${buildingId}/${file?.originalname || 'unknown'}`, // Placeholder path
        category: createDocumentDto.category || 'OTHER',
        uploadedBy,
      },
    });

    // Audit log
    if (uploadedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: uploadedBy,
          action: 'CREATE',
          entity: 'Document',
          entityId: document.id,
          newValue: { name: document.name },
        },
      });
    }

    return document;
  }

  async findAll(buildingId: string) {
    if (!buildingId) {
      return [];
    }

    return this.prisma.document.findMany({
      where: { buildingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(buildingId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, buildingId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async remove(buildingId: string, id: string, deletedBy?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, buildingId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Soft delete
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    if (deletedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: deletedBy,
          action: 'DELETE',
          entity: 'Document',
          entityId: id,
          oldValue: { name: document.name },
        },
      });
    }

    return { success: true };
  }
}
