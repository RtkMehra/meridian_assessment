import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';
import { TokenizeAssetDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

const tokenizationStatusExample = {
  mode: 'mock',
  network: 'Polygon Amoy (testnet)',
  contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f5eE2B',
  totalTokenizations: 0,
  lastTokenization: null,
  timestamp: new Date().toISOString(),
};

const tokenizeResponseExample = {
  success: true,
  transactionHash: '0xabc123def456...',
  assetId: '550e8400-e29b-41d4-a716-446655440002',
  investorId: '550e8400-e29b-41d4-a716-446655440000',
  tokensMinted: 1000,
  mode: 'mock',
  message: '[MOCK] Asset tokenized successfully',
};

@ApiTags('blockchain')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('tokenization/status')
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.ASSET_MANAGER, UserRole.OPERATIONS)
  @ApiOperation({ summary: 'Get tokenization service status' })
  @ApiResponse({
    status: 200,
    description: 'Tokenization service status',
    example: tokenizationStatusExample,
  })
  getTokenizationStatus() {
    return this.blockchainService.getTokenizationStatus();
  }

  @Post('tokenize')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.ASSET_MANAGER)
  @ApiOperation({ summary: 'Tokenize an asset (mint ERC-3643 tokens)' })
  @ApiBody({ type: TokenizeAssetDto })
  @ApiResponse({
    status: 200,
    description: 'Asset tokenized successfully',
    example: tokenizeResponseExample,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - asset or investor not found',
    example: { statusCode: 400, message: 'Asset not found', error: 'Bad Request' },
  })
  @ApiResponse({
    status: 403,
    description: 'Investor KYC not approved',
    example: { statusCode: 403, message: 'Investor KYC not approved', error: 'Forbidden' },
  })
  tokenize(@Body() payload: TokenizeAssetDto) {
    return this.blockchainService.tokenizeAsset(payload);
  }
}
