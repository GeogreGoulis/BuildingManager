import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonChargesService } from './common-charges.service';
import { CommonChargesCalculationService } from './common-charges-calculation.service';
import { CommonChargesPersistenceService } from './common-charges-persistence.service';

@Module({
  imports: [PrismaModule],
  providers: [
    CommonChargesService,
    CommonChargesCalculationService,
    CommonChargesPersistenceService,
  ],
  exports: [
    CommonChargesService,
    CommonChargesCalculationService,
    CommonChargesPersistenceService,
  ],
})
export class CommonChargesModule {}
