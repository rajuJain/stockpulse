import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

export default new DataSource({
  type: 'mysql',
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stockpulse',
  entities: ['src/**/*.entity.ts', 'src/**/*.entities.ts'],
  migrations: ['src/migrations/*.ts'],
  charset: 'utf8mb4',
  synchronize: false,
});
