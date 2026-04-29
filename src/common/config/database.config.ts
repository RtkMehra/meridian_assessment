import 'dotenv/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'meridian',
  password: process.env.DB_PASSWORD || 'meridian_dev',
  database: process.env.DB_NAME || 'meridian_dev',
  entities: [path.join(__dirname, '../..//**/*.entity{.ts,.js}')],
  synchronize: !isProduction && !isTest,
  logging: isTest ? false : !isProduction,
  dropSchema: isTest,
};
