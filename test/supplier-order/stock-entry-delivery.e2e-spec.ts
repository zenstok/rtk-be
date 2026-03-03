import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { createTestApp } from '../utils/test-app.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { TestFactories, resetFactoryCounter } from '../utils/factories';
import { SupplierOrderService } from '../../src/modules/supplier-order/supplier-order.service';
import {
  StockEntry,
  StockEntryOrigin,
} from '../../src/modules/stock-entry/entities/stock-entry.entity';
import { StockEntryDelivery } from '../../src/modules/stock-entry/entities/stock-entry-delivery.entity';

describe('SupplierOrderService stock entry delivery (integration)', () => {
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

  async function createBaseScenario(opts?: { customerOfferId?: number }) {
    const seed = await factories.seedSupplierOrderBase();
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      opts?.customerOfferId
        ? { customerOfferId: opts.customerOfferId }
        : undefined,
    );
    const sor = await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
      orderedQuantity: 10,
    });
    return { ...seed, so, sor };
  }

  describe('createStockEntryDelivery', () => {
    it('should create an unconfirmed delivery', async () => {
      const { so, sor } = await createBaseScenario();

      const result = await service.createStockEntryDelivery(so.id, {
        supplierOrderRowId: sor.id,
        quantity: 5,
        estimatedShipmentDate: '2026-03-01',
      });

      expect(result.id).toBeDefined();
      expect(result.quantity).toBe(5);
      expect(result.shipmentDate).toBeNull();
      expect(result.supplierOrderRowId).toBe(sor.id);
    });

    it('should reject if quantity exceeds ordered quantity', async () => {
      const { so, sor } = await createBaseScenario();

      // First delivery uses 7 of 10
      await service.createStockEntryDelivery(so.id, {
        supplierOrderRowId: sor.id,
        quantity: 7,
        estimatedShipmentDate: '2026-03-01',
      });

      // Second would bring total to 11 > 10
      await expect(
        service.createStockEntryDelivery(so.id, {
          supplierOrderRowId: sor.id,
          quantity: 4,
          estimatedShipmentDate: '2026-03-15',
        }),
      ).rejects.toThrow('would exceed ordered quantity');
    });

    it('should allow delivery up to exact ordered quantity', async () => {
      const { so, sor } = await createBaseScenario();

      await service.createStockEntryDelivery(so.id, {
        supplierOrderRowId: sor.id,
        quantity: 6,
        estimatedShipmentDate: '2026-03-01',
      });

      // Second delivery brings total to exactly 10
      const result = await service.createStockEntryDelivery(so.id, {
        supplierOrderRowId: sor.id,
        quantity: 4,
        estimatedShipmentDate: '2026-03-15',
      });

      expect(result.id).toBeDefined();
      expect(result.quantity).toBe(4);
    });

    it('should reject if row does not belong to the order', async () => {
      const seed = await factories.seedSupplierOrderBase();
      const so1 = await factories.createSupplierOrder(
        seed.supplier.id,
        seed.user.id,
        seed.user.id,
      );
      const so2 = await factories.createSupplierOrder(
        seed.supplier.id,
        seed.user.id,
        seed.user.id,
      );
      const sor = await factories.createSupplierOrderRow(so1.id, seed.spc1.id);

      // Try to create delivery on so2 but with sor from so1
      await expect(
        service.createStockEntryDelivery(so2.id, {
          supplierOrderRowId: sor.id,
          quantity: 1,
          estimatedShipmentDate: '2026-03-01',
        }),
      ).rejects.toThrow('Supplier order row not found for this order');
    });

    it('should throw if supplier order does not exist', async () => {
      await expect(
        service.createStockEntryDelivery(99999, {
          supplierOrderRowId: 1,
          quantity: 1,
          estimatedShipmentDate: '2026-03-01',
        }),
      ).rejects.toThrow('Supplier order not found');
    });
  });

  describe('finalizeStockEntryDelivery', () => {
    it('should create stock entries with FROM_SIMPLE for standalone order', async () => {
      const { so, sor } = await createBaseScenario();
      const delivery = await factories.createStockEntryDelivery(sor.id, {
        quantity: 3,
      });

      const result = await service.finalizeStockEntryDelivery(delivery.id, {
        serialNumbers: ['SN-001', 'SN-002', 'SN-003'],
        shipmentDate: '2026-02-01',
        supplierInvoiceNumber: 'INV-001',
        supplierInvoiceDate: '2026-02-01',
        supplierCurrencyToRonExchangeRate: 4.95,
      });

      expect(result.stockEntriesCreated).toBe(3);

      const seRepo = dataSource.getRepository(StockEntry);
      const entries = await seRepo.find({
        where: { stockEntryDeliveryId: delivery.id },
      });
      expect(entries).toHaveLength(3);
      expect(entries[0]!.origin).toBe(
        StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      );
      expect(entries[0]!.customerOfferId).toBeNull();
    });

    it('should create stock entries with FROM_RESERVED for offer-based order', async () => {
      const seed = await factories.seedSupplierOrderBase();
      const so = await factories.createSupplierOrder(
        seed.supplier.id,
        seed.user.id,
        seed.user.id,
        { customerOfferId: seed.customerOffer.id },
      );
      const sor = await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
        orderedQuantity: 2,
      });
      const delivery = await factories.createStockEntryDelivery(sor.id, {
        quantity: 2,
      });

      await service.finalizeStockEntryDelivery(delivery.id, {
        serialNumbers: ['SN-RES-A', 'SN-RES-B'],
        shipmentDate: '2026-02-01',
        supplierInvoiceNumber: 'INV-002',
        supplierInvoiceDate: '2026-02-01',
        supplierCurrencyToRonExchangeRate: 4.95,
      });

      const seRepo = dataSource.getRepository(StockEntry);
      const entries = await seRepo.find({
        where: { stockEntryDeliveryId: delivery.id },
      });
      expect(entries).toHaveLength(2);
      expect(entries[0]!.origin).toBe(
        StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      );
      expect(entries[0]!.customerOfferId).toBe(seed.customerOffer.id);
    });

    it('should set shipmentDate on the delivery', async () => {
      const { sor } = await createBaseScenario();
      const delivery = await factories.createStockEntryDelivery(sor.id, {
        quantity: 1,
      });

      await service.finalizeStockEntryDelivery(delivery.id, {
        serialNumbers: ['SN-SHIP'],
        shipmentDate: '2026-02-01',
        supplierInvoiceNumber: 'INV-003',
        supplierInvoiceDate: '2026-02-01',
        supplierCurrencyToRonExchangeRate: 4.95,
      });

      const sedRepo = dataSource.getRepository(StockEntryDelivery);
      const updated = await sedRepo.findOneBy({ id: delivery.id });
      expect(updated!.shipmentDate).toBeDefined();
    });

    it('should reject if serial number count does not match quantity', async () => {
      const { sor } = await createBaseScenario();
      const delivery = await factories.createStockEntryDelivery(sor.id, {
        quantity: 3,
      });

      await expect(
        service.finalizeStockEntryDelivery(delivery.id, {
          serialNumbers: ['SN-1', 'SN-2'],
        }),
      ).rejects.toThrow('Expected 3 serial numbers, but received 2');
    });

    it('should reject duplicate serial numbers', async () => {
      const { sor } = await createBaseScenario();
      const delivery = await factories.createStockEntryDelivery(sor.id, {
        quantity: 2,
      });

      await expect(
        service.finalizeStockEntryDelivery(delivery.id, {
          serialNumbers: ['SN-DUP', 'SN-DUP'],
        }),
      ).rejects.toThrow('Duplicate serial numbers provided');
    });

    it('should reject if delivery is already finalized', async () => {
      const { sor } = await createBaseScenario();
      const delivery = await factories.createStockEntryDelivery(sor.id, {
        quantity: 1,
      });

      await service.finalizeStockEntryDelivery(delivery.id, {
        serialNumbers: ['SN-FIRST'],
        shipmentDate: '2026-02-01',
        supplierInvoiceNumber: 'INV-004',
        supplierInvoiceDate: '2026-02-01',
        supplierCurrencyToRonExchangeRate: 4.95,
      });

      await expect(
        service.finalizeStockEntryDelivery(delivery.id, {
          serialNumbers: ['SN-SECOND'],
          shipmentDate: '2026-02-01',
          supplierInvoiceNumber: 'INV-005',
          supplierInvoiceDate: '2026-02-01',
          supplierCurrencyToRonExchangeRate: 4.95,
        }),
      ).rejects.toThrow('already been finalized');
    });

    it('should throw NotFoundException for non-existent delivery', async () => {
      await expect(
        service.finalizeStockEntryDelivery(99999, {
          serialNumbers: ['SN-X'],
        }),
      ).rejects.toThrow('Stock entry delivery not found');
    });
  });
});
