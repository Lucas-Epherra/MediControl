import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './common/config';
import { DosesModule } from './doses/doses.module';
import { GroupsModule } from './groups/groups.module';
import { HealthController } from './health/health.controller';
import { MedicationsModule } from './medications/medications.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    GroupsModule,
    MedicationsModule,
    DosesModule,
    PrescriptionsModule,
    AlertsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
