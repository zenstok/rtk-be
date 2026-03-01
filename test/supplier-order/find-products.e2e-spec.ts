import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { createTestApp } from '../utils/test-app.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { TestFactories, resetFactoryCounter } from '../utils/factories';
import { SupplierOrderService } from '../../src/modules/supplier-order/supplier-order.service';

const defaultPagination = { limit: 100, offset: 0 };

describe('SupplierOrderService.findProducts (integration)', () => {
  let dbConfig: TestDbConfig;
  let app: INestApplication;
  let module: TestingModule;
  let dataSource: DataSource;
  let service: SupplierOrderService;
  let factories: TestFactories;

  beforeAll(async () => {
    dbConfig = await startTestDb();
    ({ app, module } = await createTestApp(dbConfig));
    dataSource = module.get(DataSource);
    service = module.get(SupplierOrderService);
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
    const seed = await factories.seedSupplierOrderBase();
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor1 = await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
      orderedQuantity: 10,
      unitPrice: 100,
    });
    const sor2 = await factories.createSupplierOrderRow(so.id, seed.spc2.id, {
      orderedQuantity: 5,
      unitPrice: 200,
    });
    return { ...seed, so, sor1, sor2 };
  }

  it('should return rows with product info and zero quantities when no deliveries', async () => {
    const seed = await createBaseScenario();

    const result = await service.findProducts(seed.so.id, defaultPagination);

    expect(result.total).toBe(2);
    expect(result.results).toHaveLength(2);

    const row1 = result.results.find(
      (r) => r.suppliersProductCatalogId === seed.spc1.id,
    )!;
    expect(row1).toBeDefined();
    expect(row1.productName).toBe('Widget A');
    expect(row1.manufacturerCode).toBe('WA-001');
    expect(row1.orderedQuantity).toBe(10);
    expect(row1.deliveredQuantity).toBe(0);
    expect(row1.undeliveredQuantity).toBe(10);
  });

  it('should compute deliveredQuantity from shipped deliveries', async () => {
    const seed = await createBaseScenario();

    // Create a shipped delivery for sor1 (quantity=3)
    await factories.createStockEntryDelivery(seed.sor1.id, {
      quantity: 3,
      shipmentDate: new Date('2026-02-01'),
    });

    const result = await service.findProducts(seed.so.id, defaultPagination);

    const row1 = result.results.find(
      (r) => r.suppliersProductCatalogId === seed.spc1.id,
    )!;
    expect(row1.orderedQuantity).toBe(10);
    expect(row1.deliveredQuantity).toBe(3);
    expect(row1.undeliveredQuantity).toBe(7);
  });

  it('should sum multiple shipped deliveries', async () => {
    const seed = await createBaseScenario();

    // Two shipped deliveries for sor1
    await factories.createStockEntryDelivery(seed.sor1.id, {
      quantity: 3,
      shipmentDate: new Date('2026-02-01'),
    });
    await factories.createStockEntryDelivery(seed.sor1.id, {
      quantity: 4,
      shipmentDate: new Date('2026-02-15'),
    });

    const result = await service.findProducts(seed.so.id, defaultPagination);

    const row1 = result.results.find(
      (r) => r.suppliersProductCatalogId === seed.spc1.id,
    )!;
    expect(row1.deliveredQuantity).toBe(7);
    expect(row1.undeliveredQuantity).toBe(3);
  });

  it('should not count unshipped deliveries in deliveredQuantity', async () => {
    const seed = await createBaseScenario();

    // One shipped, one unshipped
    await factories.createStockEntryDelivery(seed.sor1.id, {
      quantity: 2,
      shipmentDate: new Date('2026-02-01'),
    });
    await factories.createStockEntryDelivery(seed.sor1.id, {
      quantity: 5,
      // no shipmentDate = unshipped
    });

    const result = await service.findProducts(seed.so.id, defaultPagination);

    const row1 = result.results.find(
      (r) => r.suppliersProductCatalogId === seed.spc1.id,
    )!;
    expect(row1.deliveredQuantity).toBe(2);
    expect(row1.undeliveredQuantity).toBe(8);
  });

  it('should return numeric types, not strings', async () => {
    const seed = await createBaseScenario();

    const result = await service.findProducts(seed.so.id, defaultPagination);

    const row = result.results[0]!;
    expect(typeof row.orderedQuantity).toBe('number');
    expect(typeof row.deliveredQuantity).toBe('number');
    expect(typeof row.undeliveredQuantity).toBe('number');
  });

  it('should throw NotFoundException for non-existent order', async () => {
    await expect(
      service.findProducts(99999, defaultPagination),
    ).rejects.toThrow('Supplier order not found');
  });

  describe('pagination', () => {
    it('should respect limit', async () => {
      const seed = await createBaseScenario();

      const result = await service.findProducts(seed.so.id, {
        limit: 1,
        offset: 0,
      });

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should respect offset', async () => {
      const seed = await createBaseScenario();

      const result = await service.findProducts(seed.so.id, {
        limit: 100,
        offset: 1,
      });

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(2);
    });
  });
});
