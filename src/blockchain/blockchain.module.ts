import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { ERC3643Service } from './erc3643.service';
import { FireblocksService } from './fireblocks.service';
import { AuditModule } from '../audit/audit.module';
import { EventModule } from '../common/event.module';

@Module({
  imports: [AuditModule, EventModule],
  controllers: [BlockchainController],
  providers: [BlockchainService, ERC3643Service, FireblocksService],
  exports: [BlockchainService, ERC3643Service, FireblocksService],
})
export class BlockchainModule {}
