import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'rtk_user',
      password: 'rtk_password',
      database: 'rtk_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
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
  providers: [AppService],
})
export class AppModule {}
