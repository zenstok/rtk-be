import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDbConfig } from './test-db.setup';

import { User } from '../../src/modules/user/entities/user.entity';
import { Customer } from '../../src/modules/customer/entities/customer.entity';
import { CustomerContactPerson } from '../../src/modules/customer/entities/customer-contact-person.entity';
import { Product } from '../../src/modules/product/entities/product.entity';
import { Supplier } from '../../src/modules/supplier/entities/supplier.entity';
import { SupplierContactPerson } from '../../src/modules/supplier/entities/supplier-contact-person.entity';
import { SuppliersProductCatalog } from '../../src/modules/suppliers-product-catalog/entities/suppliers-product-catalog.entity';
import { ProductProcurementRequest } from '../../src/modules/product-procurement-request/entities/product-procurement-request.entity';
import { PriceAnalysis } from '../../src/modules/price-analysis/entities/price-analysis.entity';
import { PriceAnalysisSupplierGroup } from '../../src/modules/price-analysis/entities/price-analysis-supplier-group.entity';
import { PriceAnalysisRow } from '../../src/modules/price-analysis/entities/price-analysis-row.entity';
import { CustomerOffer } from '../../src/modules/customer-offer/entities/customer-offer.entity';
import { SupplierOrder } from '../../src/modules/supplier-order/entities/supplier-order.entity';
import { SupplierOrderRow } from '../../src/modules/supplier-order/entities/supplier-order-row.entity';
import { StockEntry } from '../../src/modules/stock-entry/entities/stock-entry.entity';
import { StockEntryDelivery } from '../../src/modules/stock-entry/entities/stock-entry-delivery.entity';
import { StockExit } from '../../src/modules/stock-exit/entities/stock-exit.entity';
import { File } from '../../src/modules/file/entities/file.entity';
import { BnrApiHistory } from '../../src/modules/bnr-api/entities/bnr-api-history.entity';
import { AuthRefreshToken } from '../../src/modules/auth/entities/auth-refresh-token.entity';

import { CustomerOfferService } from '../../src/modules/customer-offer/customer-offer.service';
import { CustomerOfferRepository } from '../../src/modules/customer-offer/repositories/customer-offer.repository';
import { PriceAnalysisRowRepository } from '../../src/modules/price-analysis/repositories/price-analysis-row.repository';
import { SupplierOrderService } from '../../src/modules/supplier-order/supplier-order.service';
import { SupplierOrderRepository } from '../../src/modules/supplier-order/repositories/supplier-order.repository';
import { SupplierOrderRowRepository } from '../../src/modules/supplier-order/repositories/supplier-order-row.repository';
import { StockEntryDeliveryRepository } from '../../src/modules/supplier-order/repositories/stock-entry-delivery.repository';

const ALL_ENTITIES = [
  User,
  Customer,
  CustomerContactPerson,
  Product,
  Supplier,
  SupplierContactPerson,
  SuppliersProductCatalog,
  ProductProcurementRequest,
  PriceAnalysis,
  PriceAnalysisSupplierGroup,
  PriceAnalysisRow,
  CustomerOffer,
  SupplierOrder,
  SupplierOrderRow,
  StockEntry,
  StockEntryDelivery,
  StockExit,
  File,
  BnrApiHistory,
  AuthRefreshToken,
];

export async function createTestApp(
  dbConfig: TestDbConfig,
): Promise<{ app: INestApplication; module: TestingModule }> {
  const module = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        entities: ALL_ENTITIES,
        synchronize: true,
        dropSchema: true,
      }),
      TypeOrmModule.forFeature(ALL_ENTITIES),
    ],
    providers: [
      CustomerOfferService,
      CustomerOfferRepository,
      PriceAnalysisRowRepository,
      SupplierOrderService,
      SupplierOrderRepository,
      SupplierOrderRowRepository,
      StockEntryDeliveryRepository,
    ],
  }).compile();

  const app = module.createNestApplication();
  await app.init();

  return { app, module };
}
