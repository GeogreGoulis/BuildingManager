import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../common/services/pdf.service';
import { DocumentVersioningService } from '../common/services/document-versioning.service';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

/**
 * Print Service
 * 
 * High-level service for generating printable documents:
 * - Common Charges Summary
 * - Apartment Statements
 * - Annual Reports
 */
@Injectable()
export class PrintService {
  private readonly storagePath = join(process.cwd(), 'storage', 'pdfs');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly versioningService: DocumentVersioningService,
  ) {
    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  private async ensureStorageDirectory() {
    try {
      await mkdir(this.storagePath, { recursive: true });
    } catch (error) {
      // Directory may already exist
    }
  }

  /**
   * Generate Common Charges Summary PDF
   */
  async generateCommonChargesSummary(
    periodId: string,
    userId: string,
    forceRegenerate = false,
  ): Promise<{ pdf: Buffer; version: string; fromCache: boolean }> {
    // Get period data
    const period = await this.prisma.commonChargePeriod.findUnique({
      where: { id: periodId },
      include: {
        building: true,
        lines: {
          include: {
            apartment: true,
          },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Common charge period not found');
    }

    // Get expenses for this period
    const expenses = await this.prisma.expense.findMany({
      where: {
        buildingId: period.buildingId,
        expenseDate: {
          gte: period.startDate,
          lt: period.endDate,
        },
        deletedAt: null,
      },
      include: {
        category: true,
        supplier: true,
      },
      orderBy: {
        expenseDate: 'asc',
      },
    });

    // Prepare data for template
    const data = this.prepareCommonChargesData(period, expenses);

    // Generate data hash
    const dataHash = this.pdfService.generateDataHash(data);

    // Check if document already exists (if period is locked)
    if (period.isLocked && !forceRegenerate) {
      const existing = await this.versioningService.findByDataHash(
        'CommonChargePeriod',
        periodId,
        dataHash,
      );

      if (existing) {
        // Return cached PDF
        const pdfBuffer = await this.loadPdfFromStorage(existing.filePath);
        return {
          pdf: pdfBuffer,
          version: await this.extractVersionFromMetadata(existing.id),
          fromCache: true,
        };
      }
    }

    // Validate locked period
    if (period.isLocked) {
      const validation = await this.versioningService.validateLockedPeriod(
        periodId,
        dataHash,
      );

      if (!validation.isValid) {
        throw new BadRequestException(validation.message);
      }
    }

    // Generate version number
    const version = await this.versioningService.generateVersionNumber(
      'CommonChargePeriod',
      periodId,
    );

    // Generate PDF
    const { pdf } = await this.pdfService.createDocument(
      'common-charges-summary',
      data,
      {
        version,
        isLocked: period.isLocked,
      },
    );

    // Save PDF to storage
    const startDate = new Date(period.startDate);
    const fileName = `common-charges-${period.buildingId}-${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${version}.pdf`;
    const filePath = await this.savePdfToStorage(fileName, pdf);

    // Store document metadata
    await this.versioningService.storeDocument({
      entityType: 'CommonChargePeriod',
      entityId: periodId,
      buildingId: period.buildingId,
      version,
      dataHash,
      templateVersion: this.pdfService.getTemplateVersion(),
      filePath,
      fileSize: pdf.length,
      fileName,
      createdBy: userId,
    });

    return {
      pdf,
      version,
      fromCache: false,
    };
  }

  /**
   * Generate Apartment Statement PDF
   */
  async generateApartmentStatement(
    apartmentId: string,
    periodId: string,
    userId: string,
  ): Promise<{ pdf: Buffer; version: string }> {
    // Get apartment data
    const apartment = await this.prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        building: true,
        owner: true,
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    // Get period data
    const period = await this.prisma.commonChargePeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Common charge period not found');
    }

    // Get charge line for this apartment
    const chargeLine = await this.prisma.commonChargeLine.findFirst({
      where: {
        periodId,
        apartmentId,
      },
    });

    if (!chargeLine) {
      throw new NotFoundException('Charge line not found for this apartment');
    }

    // Get payments for this period
    const payments = await this.prisma.payment.findMany({
      where: {
        apartmentId: apartmentId,
        paymentDate: {
          gte: period.startDate,
          lt: period.endDate,
        },
        deletedAt: null,
      },
      orderBy: {
        paymentDate: 'asc',
      },
    });

    // Prepare data for template
    const data = this.prepareApartmentStatementData(
      apartment,
      period,
      chargeLine,
      payments,
    );

    // Generate version
    const version = await this.versioningService.generateVersionNumber(
      'ApartmentStatement',
      `${apartmentId}-${periodId}`,
    );

    // Generate PDF
    const { pdf } = await this.pdfService.createDocument(
      'apartment-statement',
      data,
      {
        version,
        isLocked: period.isLocked,
      },
    );

    // Save PDF
    const startDate = new Date(period.startDate);
    const fileName = `apartment-statement-${apartmentId}-${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${version}.pdf`;
    const filePath = await this.savePdfToStorage(fileName, pdf);

    // Store metadata
    await this.versioningService.storeDocument({
      entityType: 'ApartmentStatement',
      entityId: `${apartmentId}-${periodId}`,
      buildingId: apartment.buildingId,
      version,
      dataHash: this.pdfService.generateDataHash(data),
      templateVersion: this.pdfService.getTemplateVersion(),
      filePath,
      fileSize: pdf.length,
      fileName,
      createdBy: userId,
    });

    return { pdf, version };
  }

  /**
   * Prepare data for common charges summary template
   */
  private prepareCommonChargesData(period: any, expenses: any[]): any {
    // Group expenses by category
    const expensesByCategory = this.groupExpensesByCategory(expenses);

    // Calculate category summary
    const categorySummary = this.calculateCategorySummary(expenses);

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Prepare apartment charges
    const apartmentCharges = period.lines.map((line: any) => ({
      number: line.apartment.number,
      floor: line.apartment.floor,
      sharePercentage: Number(line.apartment.sharePercentage),
      charge: Number(line.chargeAmount),
      payment: 0, // TODO: Calculate from payments
      balance: Number(line.chargeAmount),
      isNegative: Number(line.chargeAmount) > 0,
    }));

    // Calculate totals
    const chargesTotals = {
      charges: period.lines.reduce((sum: number, line: any) => sum + Number(line.chargeAmount), 0),
      payments: 0, // TODO: Calculate from payments
      balance: period.lines.reduce((sum: number, line: any) => sum + Number(line.chargeAmount), 0),
      isNegative: true,
    };

    return {
      documentTitle: 'ΚΑΤΑΣΤΑΣΗ ΚΟΙΝΟΧΡΗΣΤΩΝ',
      building: {
        name: period.building.name,
        address: period.building.address,
        taxId: period.building.taxId,
      },
      period: {
        month: new Date(period.startDate).getMonth() + 1,
        year: new Date(period.startDate).getFullYear(),
      },
      periodSummary: {
        items: [
          { label: 'Σύνολο Εξόδων', value: `${totalExpenses.toFixed(2)} €` },
          { label: 'Αριθμός Διαμερισμάτων', value: period.lines.length },
          { label: 'Κατηγορίες Εξόδων', value: categorySummary.length },
        ],
        total: {
          label: 'Συνολικό Κόστος Περιόδου',
          value: `${totalExpenses.toFixed(2)} €`,
        },
      },
      expensesByCategory,
      categorySummary,
      totalExpenses,
      apartmentCharges,
      chargesTotals,
      paymentStatus: {
        totalCharges: chargesTotals.charges,
        totalPayments: chargesTotals.payments,
        totalBalance: chargesTotals.balance,
        paidCount: 0,
        unpaidCount: period.lines.length,
        isNegative: true,
      },
      generatedDate: new Date().toLocaleDateString('el-GR'),
    };
  }

  /**
   * Prepare data for apartment statement template
   */
  private prepareApartmentStatementData(
    apartment: any,
    period: any,
    chargeLine: any,
    payments: any[],
  ): any {
    const totalCharge = Number(chargeLine.chargeAmount);
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const finalBalance = totalCharge - totalPayments;

    return {
      documentTitle: 'ΕΝΗΜΕΡΩΤΙΚΟ ΔΙΑΜΕΡΙΣΜΑΤΟΣ',
      building: {
        name: apartment.building.name,
        address: apartment.building.address,
      },
      period: {
        month: new Date(period.startDate).getMonth() + 1,
        year: new Date(period.startDate).getFullYear(),
      },
      apartment: {
        number: apartment.number,
        floor: apartment.floor,
        sharePercentage: Number(apartment.sharePercentage),
        owner: apartment.owner
          ? {
              name: `${apartment.owner.firstName} ${apartment.owner.lastName}`,
            }
          : null,
      },
      chargesBreakdown: [], // TODO: Break down by category
      totalCharge,
      payments: payments.map((p) => ({
        date: new Date(p.paymentDate).toLocaleDateString('el-GR'),
        method: p.paymentMethod || 'Μετρητά',
        reference: p.reference || p.notes || '-',
        amount: Number(p.amount),
      })),
      totalPayments,
      previousBalance: {
        amount: 0, // TODO: Calculate previous balance
        isNegative: false,
      },
      finalBalance: {
        amount: finalBalance,
        isNegative: finalBalance > 0,
      },
      paymentDueDate: new Date(period.dueDate).toLocaleDateString('el-GR'),
      generatedDate: new Date().toLocaleDateString('el-GR'),
    };
  }

  /**
   * Group expenses by category
   */
  private groupExpensesByCategory(expenses: any[]): any[] {
    const grouped = new Map<string, any>();

    expenses.forEach((expense) => {
      const categoryName = expense.category?.name || 'Άλλα';

      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, {
          categoryName,
          expenses: [],
          total: 0,
        });
      }

      const group = grouped.get(categoryName);
      group.expenses.push({
        category: categoryName,
        description: expense.description,
        date: new Date(expense.expenseDate).toLocaleDateString('el-GR'),
        amount: Number(expense.amount),
      });
      group.total += Number(expense.amount);
    });

    return Array.from(grouped.values());
  }

  /**
   * Calculate category summary
   */
  private calculateCategorySummary(expenses: any[]): any[] {
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const grouped = this.groupExpensesByCategory(expenses);

    return grouped.map((group) => ({
      name: group.categoryName,
      amount: group.total,
      percentage: totalAmount > 0 ? (group.total / totalAmount) * 100 : 0,
    }));
  }

  /**
   * Save PDF to storage
   */
  private async savePdfToStorage(fileName: string, pdf: Buffer): Promise<string> {
    const filePath = join(this.storagePath, fileName);
    await writeFile(filePath, pdf);
    return filePath;
  }

  /**
   * Load PDF from storage
   */
  private async loadPdfFromStorage(filePath: string): Promise<Buffer> {
    const { readFile } = await import('fs/promises');
    return readFile(filePath);
  }

  /**
   * Extract version from document metadata
   */
  private async extractVersionFromMetadata(documentId: string): Promise<string> {
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'Document',
        entityId: documentId,
        action: 'CREATE',
      },
    });

    return (auditLog?.metadata as any)?.version || 'v1.0';
  }
}
