import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { AuditService } from '../audit/audit.service';
import { ERC3643Service } from './erc3643.service';
import { FireblocksService } from './fireblocks.service';
import { EventEmitterPublisher } from '../common/event-emitter.publisher';
import { AuditAction } from '../common/enums/audit-action.enum';

describe('BlockchainService', () => {
  let service: BlockchainService;
  const originalEnv = process.env;

  const mockAuditService = {
    log: jest.fn().mockResolvedValue({}),
  };

  const mockERC3643Service = {
    getTokenInfo: jest.fn(),
    checkIdentityStatus: jest.fn(),
    mintTokens: jest.fn().mockResolvedValue({ transactionHash: '0xmocktxhash' }),
    transferTokens: jest.fn(),
    pauseTransfers: jest.fn(),
  };

  const mockFireblocksService = {
    getVaultAccount: jest.fn(),
    createTransaction: jest.fn(),
    getTransaction: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  beforeEach(async () => {
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: AuditService, useValue: mockAuditService },
        { provide: ERC3643Service, useValue: mockERC3643Service },
        { provide: FireblocksService, useValue: mockFireblocksService },
        { provide: EventEmitterPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getTokenizationStatus', () => {
    it('should report not_configured without integration settings', async () => {
      delete process.env.FIREBLOCKS_API_KEY;
      delete process.env.POLYGON_RPC_URL;

      const result = await service.getTokenizationStatus();

      expect(result.overall).toBe(false);
      expect(result.erc3643.configured).toBe(false);
      expect(result.fireblocks.configured).toBe(false);
    });

    it('should report configured when all settings are present', async () => {
      process.env.FIREBLOCKS_API_KEY = 'api-key';
      process.env.FIREBLOCKS_SECRET_KEY = 'secret-key';
      process.env.POLYGON_RPC_URL = 'https://polygon-rpc.com';
      process.env.CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';

      const result = await service.getTokenizationStatus();

      expect(result.overall).toBe(true);
      expect(result.erc3643.configured).toBe(true);
      expect(result.fireblocks.configured).toBe(true);
    });
  });

  describe('tokenizeAsset (mock mode)', () => {
    it('should tokenize in mock mode and audit the request', async () => {
      delete process.env.POLYGON_RPC_URL;

      const result = await service.tokenizeAsset({
        assetId: 'asset-1',
        investorId: 'user-1',
      });

      expect(result.status).toBe('mock_tokenized');
      expect(result.transaction).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.TOKEN_MINTED,
          userId: 'user-1',
          resourceId: 'asset-1',
        }),
      );
    });
  });
});
