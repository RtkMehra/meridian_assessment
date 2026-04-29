import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TokenizeAssetDto {
  @ApiProperty({ description: 'Asset ID to tokenize' })
  @IsString()
  @MinLength(1)
  assetId!: string;

  @ApiProperty({ description: 'Investor ID receiving tokens' })
  @IsString()
  @MinLength(1)
  investorId!: string;
}
