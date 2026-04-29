import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { KycModule } from './kyc/kyc.module';
import { AssetsModule } from './assets/assets.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { AuditModule } from './audit/audit.module';
import { typeOrmConfig } from './common/config/database.config';
import { EncryptionModule } from './common/encryption.module';
import { EventModule } from './common/event.module';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    EncryptionModule,
    EventModule,
    StorageModule,
    AuthModule,
    UsersModule,
    KycModule,
    AssetsModule,
    BlockchainModule,
    AuditModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
