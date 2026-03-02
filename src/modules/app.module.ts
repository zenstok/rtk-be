import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BnrApiModule } from './bnr-api/bnr-api.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { SupplierModule } from './supplier/supplier.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { PriceAnalysisModule } from './price-analysis/price-analysis.module';
import { SuppliersProductCatalogModule } from './suppliers-product-catalog/suppliers-product-catalog.module';
import { ProductProcurementRequestModule } from './product-procurement-request/product-procurement-request.module';
import { CustomerModule } from './customer/customer.module';
import { CustomerOfferModule } from './customer-offer/customer-offer.module';
import { SupplierOrderModule } from './supplier-order/supplier-order.module';
import { StockEntryModule } from './stock-entry/stock-entry.module';
import { StockExitModule } from './stock-exit/stock-exit.module';
import { FileModule } from './file/file.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5433),
        username: config.get('DB_USERNAME', 'rtk_user'),
        password: config.get('DB_PASSWORD', 'rtk_password'),
        database: config.get('DB_DATABASE', 'rtk_db'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    ScheduleModule.forRoot(),
    CacheModule.register({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 1000,
      },
    ]),
    BnrApiModule,
    AuthModule,
    SupplierModule,
    UserModule,
    ProductModule,
    PriceAnalysisModule,
    SuppliersProductCatalogModule,
    ProductProcurementRequestModule,
    CustomerModule,
    CustomerOfferModule,
    SupplierOrderModule,
    StockEntryModule,
    StockExitModule,
    FileModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
