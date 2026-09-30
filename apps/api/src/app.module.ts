import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { RolesModule } from './roles/roles.module';
import { QualificationsModule } from './qualifications/qualifications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BrandingModule } from './branding/branding.module';
import { LearningModule } from './learning/learning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    RolesModule,
    QualificationsModule,
    NotificationsModule,
    BrandingModule,
    LearningModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
