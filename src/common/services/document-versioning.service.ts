import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Document Versioning Service
 * 
 * Handles:
 * - Document version tracking
 * - Immutability for locked periods
 * - PDF storage metadata
 * - Version retrieval
 */
@Injectable()
export class DocumentVersioningService {
  private readonly logger = new Logger(DocumentVersioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate version number
   * Format: v{periodId}-{count}
   */
  async generateVersionNumber(
    entityType: string,
    entityId: string,
  ): Promise<string> {
    // Count existing versions for this entity
    const count = await this.prisma.document.count({
      where: {
        category: 'REPORT', // Assuming reports are PDFs
        // We'll use metadata to store entityType and entityId
      },
    });

    return `v${entityId}-${count + 1}`;
  }

  /**
   * Check if a period is locked
   */
  async isPeriodLocked(periodId: string): Promise<boolean> {
    const period = await this.prisma.commonChargePeriod.findUnique({
      where: { id: periodId },
      select: { isLocked: true },
    });

    return period?.isLocked ?? false;
  }

  /**
   * Store PDF document metadata
   */
  async storeDocument(params: {
    entityType: string;
    entityId: string;
    buildingId: string;
    version: string;
    dataHash: string;
    templateVersion: string;
    filePath: string;
    fileSize: number;
    fileName: string;
    createdBy: string;
  }): Promise<any> {
    const {
      entityType,
      entityId,
      buildingId,
      version,
      dataHash,
      templateVersion,
      filePath,
      fileSize,
      fileName,
      createdBy,
    } = params;

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        buildingId,
        category: 'REPORT',
        name: `${entityType}-${version}`,
        filename: fileName,
        mimeType: 'application/pdf',
        size: fileSize,
        path: filePath,
        uploadedBy: createdBy,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE',
        entity: 'Document',
        entityId: document.id,
        metadata: {
          entityType,
          entityId,
          version,
          dataHash,
          templateVersion,
          fileName,
        },
      },
    });

    this.logger.log(`Document stored: ${fileName} (version: ${version})`);

    return document;
  }

  /**
   * Find existing document by version
   */
  async findDocumentByVersion(
    entityType: string,
    entityId: string,
    version: string,
  ): Promise<any | null> {
    // Query audit logs to find document with matching metadata
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'Document',
        action: 'CREATE',
        metadata: {
          path: ['entityType'],
          equals: entityType,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!auditLog || !auditLog.entityId) {
      return null;
    }

    // Get the document
    return this.prisma.document.findUnique({
      where: { id: auditLog.entityId },
    });
  }

  /**
   * Get latest document version
   */
  async getLatestVersion(
    entityType: string,
    entityId: string,
  ): Promise<any | null> {
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'Document',
        action: 'CREATE',
        metadata: {
          path: ['entityType'],
          equals: entityType,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!auditLog || !auditLog.entityId) {
      return null;
    }

    return this.prisma.document.findUnique({
      where: { id: auditLog.entityId },
    });
  }

  /**
   * List all versions for an entity
   */
  async listVersions(
    entityType: string,
    entityId: string,
  ): Promise<any[]> {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entity: 'Document',
        action: 'CREATE',
        metadata: {
          path: ['entityType'],
          equals: entityType,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const documentIds = auditLogs.map((log: any) => log.entityId);

    return this.prisma.document.findMany({
      where: {
        id: { in: documentIds },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Check if document exists with same data hash (avoid regeneration)
   */
  async findByDataHash(
    entityType: string,
    entityId: string,
    dataHash: string,
  ): Promise<any | null> {
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'Document',
        action: 'CREATE',
        metadata: {
          path: ['dataHash'],
          equals: dataHash,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!auditLog || !auditLog.entityId) {
      return null;
    }

    return this.prisma.document.findUnique({
      where: { id: auditLog.entityId },
    });
  }

  /**
   * Validate that locked period data hasn't changed
   */
  async validateLockedPeriod(
    periodId: string,
    currentDataHash: string,
  ): Promise<{ isValid: boolean; message?: string }> {
    const isLocked = await this.isPeriodLocked(periodId);

    if (!isLocked) {
      return { isValid: true };
    }

    // Find existing document for this period
    const existingDoc = await this.findByDataHash(
      'CommonChargePeriod',
      periodId,
      currentDataHash,
    );

    if (!existingDoc) {
      return {
        isValid: false,
        message: 'Period is locked but data has changed. Cannot regenerate PDF.',
      };
    }

    return { isValid: true };
  }
}
