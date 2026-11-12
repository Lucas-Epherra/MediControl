import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { DosesController } from './doses.controller';
import { DosesService } from './doses.service';

@Module({
  imports: [AlertsModule],
  controllers: [DosesController],
  providers: [DosesService],
})
export class DosesModule {}
