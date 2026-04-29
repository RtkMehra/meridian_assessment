import { Injectable, Logger } from '@nestjs/common';
import { ERC3643Service, ERC3643TransferResult } from './erc3643.service';
import { FireblocksService } from './fireblocks.service';
import { EventPublisher, AppEvent, DomainEvent } from '../common/events.types';
import { EventEmitterPublisher } from '../common/event-emitter.publisher';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(
    private readonly erc3643Service: ERC3643Service,
    private readonly fireblocksService: FireblocksService,
    private readonly eventPublisher: EventEmitterPublisher,
    private readonly auditService: AuditService,
  ) {
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    this.eventPublisher.on(AppEvent.KYC_APPROVED, async (event: DomainEvent) => {
      this.logger.log(`Processing KYC approved event: ${event.correlationId}`);
      this.auditService.log({
        action: AuditAction.KYC_APPROVED,
        userId: event.payload.userId as string,
        resourceId: event.payload.kycId as string,
        resourceType: 'kyc',
        sourceType: 'event',
        status: 'success',
        metadata: JSON.stringify({ correlationId: event.correlationId }),
      });
    });

    this.eventPublisher.on(AppEvent.ASSET_APPROVED, async (event: DomainEvent) => {
      this.logger.log(`Processing asset approved event: ${event.correlationId}`);
      this.auditService.log({
        action: AuditAction.ASSET_APPROVED,
        userId: event.payload.approvedBy as string,
        resourceId: event.payload.assetId as string,
        resourceType: 'asset',
        sourceType: 'event',
        status: 'success',
        metadata: JSON.stringify({ correlationId: event.correlationId }),
      });
    });
  }

  async getTokenizationStatus(): Promise<{
    erc3643: { configured: boolean; network: string; rpcUrl: string };
    fireblocks: { configured: boolean; vaultAccountId: string };
    overall: boolean;
  }> {
    const erc3643Configured = Boolean(process.env.POLYGON_RPC_URL && process.env.CONTRACT_ADDRESS);
    const fireblocksConfigured = Boolean(
      process.env.FIREBLOCKS_API_KEY && process.env.FIREBLOCKS_SECRET_KEY,
    );

    return {
      erc3643: {
        configured: erc3643Configured,
        network: process.env.POLYGON_NETWORK || 'Polygon Amoy/testnet',
        rpcUrl: erc3643Configured ? '[REDACTED]' : 'not_set',
      },
      fireblocks: {
        configured: fireblocksConfigured,
        vaultAccountId: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID || 'not_set',
      },
      overall: erc3643Configured && fireblocksConfigured,
    };
  }

  async tokenizeAsset(payload: { assetId: string; investorId: string }): Promise<{
    status: string;
    transaction?: ERC3643TransferResult;
    message: string;
  }> {
    this.logger.log(`Tokenization request: asset=${payload.assetId}, investor=${payload.investorId}`);

    const isMock = !process.env.POLYGON_RPC_URL || !process.env.FIREBLOCKS_API_KEY;

    if (isMock) {
      const mockTx = await this.erc3643Service.mintTokens(
        'mock-contract-address',
        '0xMockInvestorAddress',
        '1000000000000000000000',
      );

      await this.auditService.log({
        action: AuditAction.TOKEN_MINTED,
        userId: payload.investorId,
        resourceId: payload.assetId,
        resourceType: 'asset',
        sourceType: 'api',
        status: 'success',
        metadata: JSON.stringify({ transactionHash: mockTx.transactionHash }),
      });

      await this.eventPublisher.publish({
        event: AppEvent.TOKEN_MINTED,
        timestamp: new Date().toISOString(),
        payload: { assetId: payload.assetId, investorId: payload.investorId, txHash: mockTx.transactionHash },
        correlationId: `tokenize-${Date.now()}`,
      });

      return {
        status: 'mock_tokenized',
        transaction: mockTx,
        message: 'Tokenization completed in mock mode. Configure POLYGON_RPC_URL and FIREBLOCKS_API_KEY for production.',
      };
    }

    throw new Error('Production tokenization requires POLYGON_RPC_URL, CONTRACT_ADDRESS, and FIREBLOCKS_API_KEY.');
  }

  async getAssetTokenInfo(contractAddress: string) {
    return this.erc3643Service.getTokenInfo(contractAddress);
  }

  async checkInvestorIdentity(contractAddress: string, investorAddress: string) {
    return this.erc3643Service.checkIdentityStatus(contractAddress, investorAddress);
  }

  async getVaultAccount(accountId: string) {
    return this.fireblocksService.getVaultAccount(accountId);
  }
}
