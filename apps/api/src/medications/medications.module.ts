import { Module } from '@nestjs/common';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { PlanSheetController, PlanSheetService } from './plan-sheet.controller';

@Module({
  controllers: [MedicationsController, PlanSheetController],
  providers: [MedicationsService, PlanSheetService],
})
export class MedicationsModule {}
