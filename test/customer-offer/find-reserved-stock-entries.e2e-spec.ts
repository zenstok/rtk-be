import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { createTestApp } from '../utils/test-app.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { TestFactories, resetFactoryCounter } from '../utils/factories';
import { CustomerOfferService } from '../../src/modules/customer-offer/customer-offer.service';
import { StockEntryOrigin } from '../../src/modules/stock-entry/entities/stock-entry.entity';
import {
  StockExit,
  StockExitSource,
} from '../../src/modules/stock-exit/entities/stock-exit.entity';

describe('CustomerOfferService.findReservedStockEntries (integration)', () => {
  let dbConfig: TestDbConfig;
  let app: INestApplication;
  let module: TestingModule;
  let dataSource: DataSource;
  let service: CustomerOfferService;
  let factories: TestFactories;

  beforeAll(async () => {
    dbConfig = await startTestDb();
    ({ app, module } = await createTestApp(dbConfig));
    dataSource = module.get(DataSource);
    service = module.get(CustomerOfferService);
    factories = new TestFactories(dataSource);
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await stopTestDb();
  });

  afterEach(async () => {
    await cleanDatabase(dataSource);
    resetFactoryCounter();
  });

  async function createBaseScenario() {
    const seed = await factories.seedFindAllProductsBase();

    // Simple supplier order with stock entries reserved to this offer
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor1 = await factories.createSupplierOrderRow(so.id, seed.spc1.id);
    const sor2 = await factories.createSupplierOrderRow(so.id, seed.spc2.id);
    const delivery1 = await factories.createStockEntryDelivery(sor1.id);
    const delivery2 = await factories.createStockEntryDelivery(sor2.id);

    return { ...seed, so, sor1, sor2, delivery1, delivery2 };
  }

  it('should return stock entries grouped by product', async () => {
    const seed = await createBaseScenario();

    // 2 entries for product1, 1 for product2
    await factories.createStockEntry('SN-P1-A', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-P1-B', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-P2-A', seed.delivery2.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    const result = await service.findReservedStockEntries(
      seed.customerOffer.id,
    );

    expect(result).toHaveLength(2); // 2 product groups

    const group1 = result.find((g) => g.productId === seed.product1.id)!;
    expect(group1).toBeDefined();
    expect(group1.productName).toBe('Widget A');
    expect(group1.manufacturerCode).toBe('WA-001');
    expect(group1.stockEntries).toHaveLength(2);
    expect(group1.stockEntries.map((e) => e.serialNumber).sort()).toEqual([
      'SN-P1-A',
      'SN-P1-B',
    ]);

    const group2 = result.find((g) => g.productId === seed.product2.id)!;
    expect(group2).toBeDefined();
    expect(group2.stockEntries).toHaveLength(1);
    expect(group2.stockEntries[0]!.serialNumber).toBe('SN-P2-A');
  });

  it('should include stockExitId when a stock exit exists', async () => {
    const seed = await createBaseScenario();

    await factories.createStockEntry('SN-WITH-EXIT', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-NO-EXIT', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    // Create a stock exit for one of them
    const stockExitRepo = dataSource.getRepository(StockExit);
    const stockExit = await stockExitRepo.save(
      stockExitRepo.create({
        stockEntrySerialNumber: 'SN-WITH-EXIT',
        source: StockExitSource.FROM_OFFER_RESERVATION,
        customerId: seed.customer.id,
        customerOfferId: seed.customerOffer.id,
        invoiceDate: new Date('2026-01-15'),
        invoiceNumber: 'INV-001',
        exitPriceRon: 500,
        exitPriceEur: 100,
        sourceCountry: 'Romania',
        destinationCountry: 'Germany',
        productLocalization: 'la rtk',
        observations: 'test',
        declarationOfConformityNumber: 'DC-001',
        declarationOfConformityDate: new Date('2026-01-15'),
        handoverReceptionReportNumber: 'HR-001',
        handoverReceptionReportDate: new Date('2026-01-15'),
        warrantyQualityCertificateNumber: 'WQ-001',
        warrantyQualityCertificateDate: new Date('2026-01-15'),
        warrantyStatus: 'Under Warranty',
        warrantyExpirationDate: new Date('2027-01-15'),
        physicallyDelivered: false,
      }),
    );

    const result = await service.findReservedStockEntries(
      seed.customerOffer.id,
    );

    const group = result.find((g) => g.productId === seed.product1.id)!;
    const withExit = group.stockEntries.find(
      (e) => e.serialNumber === 'SN-WITH-EXIT',
    )!;
    const noExit = group.stockEntries.find(
      (e) => e.serialNumber === 'SN-NO-EXIT',
    )!;

    expect(withExit.stockExitId).toBe(stockExit.id);
    expect(noExit.stockExitId).toBeNull();
  });

  it('should exclude FROM_RESERVED_SUPPLIER_ORDER stock entries', async () => {
    const seed = await createBaseScenario();

    // This one should be included (simple origin, reserved to offer)
    await factories.createStockEntry('SN-SIMPLE', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    // This one should be excluded (reserved origin)
    await factories.createStockEntry('SN-RESERVED', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    const result = await service.findReservedStockEntries(
      seed.customerOffer.id,
    );

    const allSerials = result.flatMap((g) =>
      g.stockEntries.map((e) => e.serialNumber),
    );
    expect(allSerials).toContain('SN-SIMPLE');
    expect(allSerials).not.toContain('SN-RESERVED');
  });

  it('should exclude stock entries from other customer offers', async () => {
    const seed = await createBaseScenario();

    await factories.createStockEntry('SN-OURS', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    // Create another offer and reserve stock to it
    const customer2 = await factories.createCustomer();
    const cp1 = await factories.createCustomerContactPerson(customer2.id);
    const cp2 = await factories.createCustomerContactPerson(customer2.id);
    const ppr2 = await factories.createProductProcurementRequest(
      seed.user.id,
      customer2.id,
      cp1.id,
      cp2.id,
    );
    const pa2 = await factories.createPriceAnalysis(ppr2.id);
    const otherOffer = await factories.createCustomerOffer(
      pa2.id,
      customer2.id,
    );
    await factories.createStockEntry('SN-OTHER', seed.delivery1.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: otherOffer.id,
    });

    const result = await service.findReservedStockEntries(
      seed.customerOffer.id,
    );

    const allSerials = result.flatMap((g) =>
      g.stockEntries.map((e) => e.serialNumber),
    );
    expect(allSerials).toContain('SN-OURS');
    expect(allSerials).not.toContain('SN-OTHER');
  });

  it('should return empty array when no reserved stock entries exist', async () => {
    const seed = await factories.seedFindAllProductsBase();

    const result = await service.findReservedStockEntries(
      seed.customerOffer.id,
    );

    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent customer offer', async () => {
    const result = await service.findReservedStockEntries(99999);
    expect(result).toEqual([]);
  });
});
