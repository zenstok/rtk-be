import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { createTestApp } from '../utils/test-app.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { TestFactories, resetFactoryCounter } from '../utils/factories';
import { SupplierOrderService } from '../../src/modules/supplier-order/supplier-order.service';
import { SupplierOrderStatus } from '../../src/modules/supplier-order/entities/supplier-order.entity';
import { SupplierOrderRow } from '../../src/modules/supplier-order/entities/supplier-order-row.entity';

describe('SupplierOrderService.create (integration)', () => {
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

  async function createBaseEntities() {
    const seed = await factories.seedSupplierOrderBase();
    return seed;
  }

  it('should create an offer-based supplier order with rows', async () => {
    const seed = await createBaseEntities();

    const result = await service.create({
      supplierOrderRegistrationNumber: 'SO-001',
      orderAcknowledgmentNumber: 'OAN-001',
      orderAcknowledgmentDate: '2026-01-15',
      endUser: 'Test End User',
      partialShipment: false,
      incoterm2010: 'FOB',
      meanOfShipment: 'Truck',
      userInChargeId: seed.user.id,
      requestedDeliveryDate: '2026-03-01',
      remarks: 'Test remarks',
      termsAndMeanOfPayment: 'Net 30',
      pointOfSales: 'Bucharest',
      otherInstructions: 'None',
      supplierId: seed.supplier.id,
      assignedUserId: seed.user.id,
      customerOfferId: seed.customerOffer.id,
      rows: [
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
      ],
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe(SupplierOrderStatus.CREATED);
    expect(result.customerOfferId).toBe(seed.customerOffer.id);

    // Verify rows were created
    const rowRepo = dataSource.getRepository(SupplierOrderRow);
    const rows = await rowRepo.find({
      where: { supplierOrderId: result.id },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.suppliersProductCatalogId).sort()).toEqual(
      [seed.spc1.id, seed.spc2.id].sort(),
    );
  });

  it('should create a manual supplier order with rows', async () => {
    const seed = await createBaseEntities();

    const result = await service.create({
      supplierOrderRegistrationNumber: 'SO-002',
      orderAcknowledgmentNumber: 'OAN-002',
      orderAcknowledgmentDate: '2026-01-15',
      endUser: 'Manual End User',
      partialShipment: true,
      incoterm2010: 'CIF',
      meanOfShipment: 'Air',
      userInChargeId: seed.user.id,
      requestedDeliveryDate: '2026-04-01',
      remarks: 'Manual order',
      termsAndMeanOfPayment: 'Net 60',
      pointOfSales: 'Cluj',
      otherInstructions: 'Rush',
      supplierId: seed.supplier.id,
      assignedUserId: seed.user.id,
      orderReference: 'REF-123',
      manualCreationReason: 'Direct purchase',
      transportationCost: 150,
      rows: [
        {
          suppliersProductCatalogId: seed.spc1.id,
          unitPrice: 80,
          orderedQuantity: 10,
        },
      ],
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe(SupplierOrderStatus.CREATED);
    expect(result.customerOfferId).toBeNull();
    expect(result.orderReference).toBe('REF-123');
    expect(result.manualCreationReason).toBe('Direct purchase');
    expect(result.transportationCost).toBe(150);
  });

  it('should reject offer-based order with manual-only fields set', async () => {
    const seed = await createBaseEntities();

    await expect(
      service.create({
        supplierOrderRegistrationNumber: 'SO-003',
        orderAcknowledgmentNumber: 'OAN-003',
        orderAcknowledgmentDate: '2026-01-15',
        endUser: 'Test',
        partialShipment: false,
        incoterm2010: 'FOB',
        meanOfShipment: 'Truck',
        userInChargeId: seed.user.id,
        requestedDeliveryDate: '2026-03-01',
        remarks: '',
        termsAndMeanOfPayment: 'Net 30',
        pointOfSales: '',
        otherInstructions: '',
        supplierId: seed.supplier.id,
        assignedUserId: seed.user.id,
        customerOfferId: seed.customerOffer.id,
        orderReference: 'SHOULD-NOT-BE-HERE',
        rows: [
          {
            suppliersProductCatalogId: seed.spc1.id,
            unitPrice: 50,
            orderedQuantity: 1,
          },
        ],
      }),
    ).rejects.toThrow('must not be set for offer-based orders');
  });

  it('should reject manual order without required manual fields', async () => {
    const seed = await createBaseEntities();

    await expect(
      service.create({
        supplierOrderRegistrationNumber: 'SO-004',
        orderAcknowledgmentNumber: 'OAN-004',
        orderAcknowledgmentDate: '2026-01-15',
        endUser: 'Test',
        partialShipment: false,
        incoterm2010: 'FOB',
        meanOfShipment: 'Truck',
        userInChargeId: seed.user.id,
        requestedDeliveryDate: '2026-03-01',
        remarks: '',
        termsAndMeanOfPayment: 'Net 30',
        pointOfSales: '',
        otherInstructions: '',
        supplierId: seed.supplier.id,
        assignedUserId: seed.user.id,
        // No customerOfferId AND no orderReference/manualCreationReason/transportationCost
        rows: [
          {
            suppliersProductCatalogId: seed.spc1.id,
            unitPrice: 50,
            orderedQuantity: 1,
          },
        ],
      }),
    ).rejects.toThrow('required for manual orders');
  });

  it('should atomically create order and rows (all or nothing)', async () => {
    const seed = await createBaseEntities();

    const rowRepo = dataSource.getRepository(SupplierOrderRow);
    const countBefore = await rowRepo.count();

    const result = await service.create({
      supplierOrderRegistrationNumber: 'SO-ATOMIC',
      orderAcknowledgmentNumber: 'OAN-ATOMIC',
      orderAcknowledgmentDate: '2026-01-15',
      endUser: 'Atomic',
      partialShipment: false,
      incoterm2010: 'FOB',
      meanOfShipment: 'Truck',
      userInChargeId: seed.user.id,
      requestedDeliveryDate: '2026-03-01',
      remarks: '',
      termsAndMeanOfPayment: 'Net 30',
      pointOfSales: '',
      otherInstructions: '',
      supplierId: seed.supplier.id,
      assignedUserId: seed.user.id,
      orderReference: 'REF-ATOMIC',
      manualCreationReason: 'Test',
      transportationCost: 0,
      rows: [
        {
          suppliersProductCatalogId: seed.spc1.id,
          unitPrice: 10,
          orderedQuantity: 1,
        },
        {
          suppliersProductCatalogId: seed.spc2.id,
          unitPrice: 20,
          orderedQuantity: 2,
        },
      ],
    });

    const countAfter = await rowRepo.count();
    expect(countAfter - countBefore).toBe(2);

    const rows = await rowRepo.find({
      where: { supplierOrderId: result.id },
    });
    expect(rows).toHaveLength(2);
  });
});
