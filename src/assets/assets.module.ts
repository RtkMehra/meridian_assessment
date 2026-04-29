import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetEntity } from './asset.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AuditModule } from '../audit/audit.module';
import { EventModule } from '../common/event.module';

@Module({
  imports: [TypeOrmModule.forFeature([AssetEntity]), AuditModule, EventModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService, TypeOrmModule],
})
export class AssetsModule {}
