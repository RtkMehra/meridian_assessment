import { IsString, IsNumber, IsOptional, IsEnum, MinLength, Min, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssetStatus } from './asset.entity';

export class CreateAssetDto {
  @ApiProperty({ example: 'Dubai Commercial Building' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ example: 'Premium office space in Downtown Dubai' })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ example: '123 Sheikh Zayed Road, Dubai, UAE' })
  @IsString()
  @MinLength(5)
  propertyAddress!: string;

  @ApiProperty({ example: 'UAE' })
  @IsString()
  jurisdiction!: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  estimatedValue!: number;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  tokenizedAmount!: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  createdById?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  propertyAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  tokenizedAmount?: number;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;
}

export class AssetResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  propertyAddress!: string;

  @ApiProperty()
  jurisdiction!: string;

  @ApiProperty()
  estimatedValue!: number;

  @ApiProperty()
  tokenizedAmount!: number;

  @ApiProperty()
  createdById!: string;

  @ApiProperty({ enum: AssetStatus })
  status!: AssetStatus;

  @ApiProperty({ nullable: true })
  contractAddress!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
