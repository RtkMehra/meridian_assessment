import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycEntity } from './kyc.entity';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { EventModule } from '../common/event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycEntity]),
    AuditModule,
    forwardRef(() => UsersModule),
    EventModule,
  ],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService, TypeOrmModule],
})
export class KycModule {}
