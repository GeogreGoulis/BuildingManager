import { Module } from '@nestjs/common';
import { PrintController } from './print.controller';
import { PrintService } from './print.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfService } from '../common/services/pdf.service';
import { DocumentVersioningService } from '../common/services/document-versioning.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrintController],
  providers: [PrintService, PdfService, DocumentVersioningService],
  exports: [PrintService],
})
export class PrintModule {}
