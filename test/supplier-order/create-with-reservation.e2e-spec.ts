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
import { SupplierOrderRow } from '../../src/modules/supplier-order/entities/supplier-order-row.entity';
import { SupplierOrderStatus } from '../../src/modules/supplier-order/entities/supplier-order.entity';

describe('SupplierOrderService.createWithReservation (integration)', () => {
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

  function baseDto(
    customerOfferId: number,
    supplierId: number,
    userId: number,
    rows: {
      suppliersProductCatalogId: number;
      unitPrice: number;
      orderedQuantity: number;
    }[],
  ) {
    return {
      customerOfferId,
      supplierId,
      supplierOrderRegistrationNumber: 'SO-RES-001',
      orderAcknowledgmentNumber: 'OAN-RES-001',
      orderAcknowledgmentDate: '2026-01-15',
      endUser: 'Reservation User',
      partialShipment: false,
      incoterm2010: 'FOB',
      meanOfShipment: 'Truck',
      userInChargeId: userId,
      requestedDeliveryDate: '2026-03-01',
      remarks: '',
      termsAndMeanOfPayment: 'Net 30',
      pointOfSales: '',
      otherInstructions: '',
      assignedUserId: userId,
      rows,
    };
  }

  async function createFreeStockEntries(
    seed: Awaited<ReturnType<TestFactories['seedSupplierOrderBase']>>,
    spcId: number,
    serialNumbers: string[],
  ) {
    // Create a standalone supplier order with deliveries + finalized stock entries
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor = await factories.createSupplierOrderRow(so.id, spcId, {
      orderedQuantity: serialNumbers.length,
    });
    const delivery = await factories.createStockEntryDelivery(sor.id, {
      quantity: serialNumbers.length,
      shipmentDate: new Date('2026-01-20'),
    });

    const entries: StockEntry[] = [];
    for (const sn of serialNumbers) {
      const entry = await factories.createStockEntry(sn, delivery.id, {
        origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
        customerOfferId: undefined,
      });
      entries.push(entry);
    }
    return entries;
  }

  it('should create order + rows and reserve free stock entries', async () => {
    const seed = await factories.seedSupplierOrderBase();

    // Create 3 free stock entries for spc1
    await createFreeStockEntries(seed, seed.spc1.id, [
      'FREE-A',
      'FREE-B',
      'FREE-C',
    ]);

    const result = await service.createWithReservation(
      baseDto(seed.customerOffer.id, seed.supplier.id, seed.user.id, [
        {
          suppliersProductCatalogId: seed.spc1.id,
          unitPrice: 100,
          orderedQuantity: 5,
        },
      ]),
    );

    expect(result.id).toBeDefined();
    expect(result.status).toBe(SupplierOrderStatus.CREATED);
    expect(result.customerOfferId).toBe(seed.customerOffer.id);

    // Verify rows created
    const rowRepo = dataSource.getRepository(SupplierOrderRow);
    const rows = await rowRepo.find({
      where: { supplierOrderId: result.id },
    });
    expect(rows).toHaveLength(1);

    // Verify free stock entries got reserved
    const seRepo = dataSource.getRepository(StockEntry);
    const reservedEntries = await seRepo.find({
      where: { customerOfferId: seed.customerOffer.id },
    });
    expect(reservedEntries).toHaveLength(3);
    const reservedSerials = reservedEntries.map((e) => e.serialNumber).sort();
    expect(reservedSerials).toEqual(['FREE-A', 'FREE-B', 'FREE-C']);
  });

  it('should only reserve FROM_SIMPLE entries with NULL customerOfferId', async () => {
    const seed = await factories.seedSupplierOrderBase();

    // Create free stock entries (simple, null customerOfferId)
    await createFreeStockEntries(seed, seed.spc1.id, ['SIMPLE-FREE']);

    // Create a reserved stock entry (has customerOfferId set)
    const otherSo = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    const otherSor = await factories.createSupplierOrderRow(
      otherSo.id,
      seed.spc1.id,
    );
    const otherDelivery = await factories.createStockEntryDelivery(
      otherSor.id,
      {
        quantity: 1,
        shipmentDate: new Date('2026-01-20'),
      },
    );
    await factories.createStockEntry('RESERVED-EXISTING', otherDelivery.id, {
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    // Create a new offer to reserve to
    const customer2 = await factories.createCustomer();
    const cp = await factories.createCustomerContactPerson(customer2.id);
    const cp2 = await factories.createCustomerContactPerson(customer2.id);
    const ppr = await factories.createProductProcurementRequest(
      seed.user.id,
      customer2.id,
      cp.id,
      cp2.id,
    );
    const pa = await factories.createPriceAnalysis(ppr.id);
    const newOffer = await factories.createCustomerOffer(pa.id, customer2.id);

    await service.createWithReservation(
      baseDto(newOffer.id, seed.supplier.id, seed.user.id, [
        {
          suppliersProductCatalogId: seed.spc1.id,
          unitPrice: 100,
          orderedQuantity: 5,
        },
      ]),
    );

    // Only the free entry should be reserved to the new offer
    const seRepo = dataSource.getRepository(StockEntry);

    const simpleEntry = await seRepo.findOneBy({
      serialNumber: 'SIMPLE-FREE',
    });
    expect(simpleEntry!.customerOfferId).toBe(newOffer.id);

    // The already-reserved entry should remain unchanged
    const reservedEntry = await seRepo.findOneBy({
      serialNumber: 'RESERVED-EXISTING',
    });
    expect(reservedEntry!.customerOfferId).toBe(seed.customerOffer.id);
  });

  it('should handle case with no free stock entries gracefully', async () => {
    const seed = await factories.seedSupplierOrderBase();

    // No free stock entries exist at all
    const result = await service.createWithReservation(
      baseDto(seed.customerOffer.id, seed.supplier.id, seed.user.id, [
        {
          suppliersProductCatalogId: seed.spc1.id,
          unitPrice: 100,
          orderedQuantity: 5,
        },
      ]),
    );

    expect(result.id).toBeDefined();
    expect(result.status).toBe(SupplierOrderStatus.CREATED);

    // No entries should be reserved
    const seRepo = dataSource.getRepository(StockEntry);
    const reserved = await seRepo.find({
      where: { customerOfferId: seed.customerOffer.id },
    });
    expect(reserved).toHaveLength(0);
  });

  it('should reserve entries for multiple product catalogs', async () => {
    const seed = await factories.seedSupplierOrderBase();

    await createFreeStockEntries(seed, seed.spc1.id, [
      'P1-FREE-A',
      'P1-FREE-B',
    ]);
    await createFreeStockEntries(seed, seed.spc2.id, ['P2-FREE-A']);

    await service.createWithReservation(
      baseDto(seed.customerOffer.id, seed.supplier.id, seed.user.id, [
        {
          suppliersProductCatalogId: seed.spc1.id,
          unitPrice: 100,
          orderedQuantity: 5,
        },
        {
          suppliersProductCatalogId: seed.spc2.id,
          unitPrice: 200,
          orderedQuantity: 3,
        },
      ]),
    );

    const seRepo = dataSource.getRepository(StockEntry);
    const reserved = await seRepo.find({
      where: { customerOfferId: seed.customerOffer.id },
    });
    expect(reserved).toHaveLength(3);
    const serials = reserved.map((e) => e.serialNumber).sort();
    expect(serials).toEqual(['P1-FREE-A', 'P1-FREE-B', 'P2-FREE-A']);
  });
});
