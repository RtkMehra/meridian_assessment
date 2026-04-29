import { IsString, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus } from './kyc.entity';

export class CreateKycDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MinLength(1)
  userId?: string;

  @ApiProperty({ example: 'passport' })
  @IsString()
  documentType!: string;

  @ApiProperty({ example: 's3://bucket/kyc-doc.pdf' })
  @IsString()
  documentUri!: string;

  @ApiPropertyOptional({ example: 'UAE' })
  @IsOptional()
  @IsString()
  jurisdiction?: string;
}

export class UpdateKycDto {
  @ApiPropertyOptional({ enum: KycStatus })
  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  amlFlagged?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  amlFlagReason?: string;
}

export class KycResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: KycStatus })
  status!: KycStatus;

  @ApiProperty({ nullable: true })
  jurisdiction!: string | null;

  @ApiProperty()
  amlFlagged!: boolean;

  @ApiProperty()
  submittedAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  approvedAt!: Date | null;

  @ApiProperty({ nullable: true })
  expiresAt!: Date | null;
}
