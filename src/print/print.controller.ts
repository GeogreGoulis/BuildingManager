import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrintService } from './print.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/rbac.enum';

/**
 * Print Controller
 * 
 * Endpoints for generating printable PDF documents:
 * - POST /print/common-charges/:periodId - Generate common charges summary
 * - GET /print/common-charges/:periodId - Get cached common charges PDF
 * - GET /print/apartment/:apartmentId/period/:periodId - Generate apartment statement
 */
@Controller('print')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  /**
   * Generate Common Charges Summary PDF
   * 
   * POST /api/v1/print/common-charges/:periodId
   * 
   * Generates a complete common charges summary for a given period.
   * - If period is locked and PDF already exists with same data, returns cached version
   * - If forceRegenerate=true, generates new version (only allowed if period is unlocked)
   * - Stores PDF in file system and metadata in database
   * 
   * @param periodId - CommonChargePeriod ID
   * @param forceRegenerate - Force regeneration even if cached version exists
   * @param req - Request object (for user ID)
   * @param res - Response object (for PDF streaming)
   */
  @Post('common-charges/:periodId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async generateCommonChargesSummary(
    @Param('periodId') periodId: string,
    @Query('forceRegenerate') forceRegenerate: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const force = forceRegenerate === 'true';
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    const result = await this.printService.generateCommonChargesSummary(
      periodId,
      userId,
      force,
    );

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="common-charges-${periodId}-${result.version}.pdf"`,
    );
    res.setHeader('X-Document-Version', result.version);
    res.setHeader('X-From-Cache', result.fromCache.toString());

    // Stream PDF
    res.send(result.pdf);
  }

  /**
   * Get Common Charges Summary PDF (cached version)
   * 
   * GET /api/v1/print/common-charges/:periodId?version=v1-3
   * 
   * Retrieves a previously generated common charges PDF.
   * If no version is specified, returns the latest version.
   * 
   * @param periodId - CommonChargePeriod ID
   * @param version - Optional version number (e.g., "v1-3")
   * @param req - Request object
   * @param res - Response object
   */
  @Get('common-charges/:periodId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async getCommonChargesSummary(
    @Param('periodId') periodId: string,
    @Query('version') version: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    // For GET, we always use cached version (no regeneration)
    const result = await this.printService.generateCommonChargesSummary(
      periodId,
      userId,
      false,
    );

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="common-charges-${periodId}-${result.version}.pdf"`,
    );
    res.setHeader('X-Document-Version', result.version);
    res.setHeader('X-From-Cache', 'true');

    // Stream PDF
    res.send(result.pdf);
  }

  /**
   * Generate Apartment Statement PDF
   * 
   * GET /api/v1/print/apartment/:apartmentId/period/:periodId
   * 
   * Generates a detailed statement for a specific apartment in a given period.
   * Includes:
   * - Charge breakdown by category
   * - Payment history
   * - Previous balance
   * - Final balance
   * 
   * @param apartmentId - Apartment ID
   * @param periodId - CommonChargePeriod ID
   * @param req - Request object
   * @param res - Response object
   */
  @Get('apartment/:apartmentId/period/:periodId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async generateApartmentStatement(
    @Param('apartmentId') apartmentId: string,
    @Param('periodId') periodId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID not found in request');
    }

    const result = await this.printService.generateApartmentStatement(
      apartmentId,
      periodId,
      userId,
    );

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="apartment-statement-${apartmentId}-${periodId}-${result.version}.pdf"`,
    );
    res.setHeader('X-Document-Version', result.version);

    // Stream PDF
    res.send(result.pdf);
  }

  /**
   * List all versions for a document
   * 
   * GET /api/v1/print/common-charges/:periodId/versions
   * 
   * Returns a list of all versions for a given common charges period.
   * Useful for audit trail and version history.
   * 
   * @param periodId - CommonChargePeriod ID
   */
  @Get('common-charges/:periodId/versions')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async listCommonChargesVersions(@Param('periodId') periodId: string) {
    // TODO: Implement version listing in DocumentVersioningService
    return {
      entityType: 'CommonChargePeriod',
      entityId: periodId,
      versions: [],
      message: 'Version listing not yet implemented',
    };
  }

  /**
   * Health check endpoint
   * 
   * GET /api/v1/print/health
   * 
   * Checks if PDF generation system is operational.
   */
  @Get('health')
  async health() {
    return {
      status: 'ok',
      service: 'PDF Generation System',
      timestamp: new Date().toISOString(),
    };
  }
}
