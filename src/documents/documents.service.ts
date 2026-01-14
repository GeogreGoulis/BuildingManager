import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import * as fs from 'fs';
import * as path from 'path';

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

    // Create document record with actual file path
    const document = await this.prisma.document.create({
      data: {
        buildingId,
        name: createDocumentDto.title || file?.originalname || 'Untitled',
        filename: file?.filename || file?.originalname || 'unknown', // Use generated filename
        mimeType: file?.mimetype || 'application/octet-stream',
        size: file?.size || 0,
        path: file?.path || '', // Actual file path on disk
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

  async getFilePath(buildingId: string, id: string): Promise<{ path: string; filename: string; mimeType: string }> {
    const document = await this.findOne(buildingId, id);
    
    if (!document.path || !fs.existsSync(document.path)) {
      throw new NotFoundException('File not found on disk');
    }
    
    return {
      path: document.path,
      filename: document.name,
      mimeType: document.mimeType,
    };
  }

  async getMultipleFilePaths(buildingId: string, ids: string[]): Promise<Array<{ path: string; filename: string }>> {
    const documents = await this.prisma.document.findMany({
      where: { 
        id: { in: ids },
        buildingId,
      },
    });
    
    return documents
      .filter(doc => doc.path && fs.existsSync(doc.path))
      .map(doc => ({
        path: doc.path,
        filename: doc.name,
      }));
  }

  async update(buildingId: string, id: string, updateDocumentDto: UpdateDocumentDto, updatedBy?: string) {
    const existingDocument = await this.prisma.document.findFirst({
      where: { id, buildingId },
    });

    if (!existingDocument) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        name: updateDocumentDto.name,
        category: updateDocumentDto.category,
      },
    });

    // Audit log
    if (updatedBy) {
      await this.prisma.auditLog.create({
        data: {
          userId: updatedBy,
          action: 'UPDATE',
          entity: 'Document',
          entityId: id,
          oldValue: { name: existingDocument.name, category: existingDocument.category },
          newValue: { name: document.name, category: document.category },
        },
      });
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

    // Delete actual file from disk
    if (document.path && fs.existsSync(document.path)) {
      try {
        fs.unlinkSync(document.path);
      } catch {
        // Continue even if file deletion fails
        console.error(`Failed to delete file: ${document.path}`);
      }
    }

    // Soft delete from database
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
