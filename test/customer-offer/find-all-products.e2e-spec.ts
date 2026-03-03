import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { createTestApp } from '../utils/test-app.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { TestFactories, resetFactoryCounter } from '../utils/factories';
import { CustomerOfferService } from '../../src/modules/customer-offer/customer-offer.service';
import { CustomerOfferStatus } from '../../src/modules/customer-offer/entities/customer-offer.entity';
import { StockEntryOrigin } from '../../src/modules/stock-entry/entities/stock-entry.entity';
import { SupplierOrderStatus } from '../../src/modules/supplier-order/entities/supplier-order.entity';

describe('CustomerOfferService.findAllProducts (integration)', () => {
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

  const defaultPagination = { limit: 100, offset: 0 };

  // --- Scenario 1: Happy path ---
  it('should return price analysis rows with correct fields and zero quantities when no orders/stock exist', async () => {
    const seed = await factories.seedFindAllProductsBase();

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    expect(result.total).toBe(2);
    expect(result.results).toHaveLength(2);

    const row1Result = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(row1Result).toBeDefined();
    expect(row1Result.suppliersProductCatalogId).toBe(seed.spc1.id);
    expect(row1Result.unitPrice).toBe(100);
    expect(row1Result.totalQuantity).toBe(20);
    expect(row1Result.productDiscount).toBe(10);
    expect(row1Result.customerDiscount).toBe(5);
    expect(row1Result.supplierId).toBe(seed.supplier.id);
    expect(row1Result.supplierName).toBe(seed.supplier.name);
    expect(row1Result.productId).toBe(seed.product1.id);
    expect(row1Result.productName).toBe('Widget A');
    expect(row1Result.manufacturerCode).toBe('WA-001');

    // Zero quantities when no orders/stock
    expect(row1Result.supplierOrderQuantity).toBe(0);
    expect(row1Result.reservedQuantity).toBe(0);
    expect(row1Result.freeQuantity).toBe(20);

    const row2Result = result.results.find((r: any) => r.id === seed.row2.id)!;
    expect(row2Result.totalQuantity).toBe(15);
    expect(row2Result.supplierOrderQuantity).toBe(0);
    expect(row2Result.reservedQuantity).toBe(0);
    expect(row2Result.freeQuantity).toBe(15);
  });

  // --- Scenario 2: supplierOrderQuantity computed correctly ---
  it('should compute supplierOrderQuantity as SUM of ordered_quantity from supplier order rows', async () => {
    const seed = await factories.seedFindAllProductsBase();

    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
      orderedQuantity: 7,
    });
    await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
      orderedQuantity: 3,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    const row2 = result.results.find((r: any) => r.id === seed.row2.id)!;

    expect(row1.supplierOrderQuantity).toBe(10); // 7 + 3
    expect(row2.supplierOrderQuantity).toBe(0);
    expect(row1.freeQuantity).toBe(20 - 10 - 0); // total - ordered - reserved
  });

  // --- Scenario 3: reservedQuantity computed correctly ---
  it('should compute reservedQuantity as COUNT of FROM_SIMPLE_SUPPLIER_ORDER stock entries for this offer', async () => {
    const seed = await factories.seedFindAllProductsBase();

    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor = await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
      orderedQuantity: 10,
    });
    const delivery = await factories.createStockEntryDelivery(sor.id, {
      quantity: 3,
    });

    // Only FROM_SIMPLE_SUPPLIER_ORDER entries reserved to this offer count
    await factories.createStockEntry('SN-001', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-002', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-003', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    const row2 = result.results.find((r: any) => r.id === seed.row2.id)!;

    expect(row1.reservedQuantity).toBe(3);
    expect(row2.reservedQuantity).toBe(0);
  });

  // --- Scenario 3b: FROM_RESERVED_SUPPLIER_ORDER stock entries don't count as reserved ---
  it('should not count FROM_RESERVED_SUPPLIER_ORDER stock entries in reservedQuantity', async () => {
    const seed = await factories.seedFindAllProductsBase();

    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    const sor = await factories.createSupplierOrderRow(so.id, seed.spc1.id);
    const delivery = await factories.createStockEntryDelivery(sor.id);

    // These come from a reserved supplier order — already covered by supplierOrderQuantity
    await factories.createStockEntry('SN-RES-1', delivery.id, {
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-RES-2', delivery.id, {
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(row1.reservedQuantity).toBe(0); // NOT 2
  });

  // --- Scenario 4: freeQuantity formula ---
  it('should compute freeQuantity = totalQuantity - supplierOrderQuantity - reservedQuantity', async () => {
    const seed = await factories.seedFindAllProductsBase();

    // supplierOrderQuantity = 8 (from a dedicated supplier order)
    const soDedicated = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    await factories.createSupplierOrderRow(soDedicated.id, seed.spc1.id, {
      orderedQuantity: 8,
    });

    // reservedQuantity = 3 (from a simple supplier order, manually reserved)
    const soSimple = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor = await factories.createSupplierOrderRow(
      soSimple.id,
      seed.spc1.id,
      { orderedQuantity: 0 },
    );
    const delivery = await factories.createStockEntryDelivery(sor.id);
    await factories.createStockEntry('SN-A', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-B', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-C', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    // totalQuantity=20, supplierOrderQuantity=8, reservedQuantity=3
    expect(row1.freeQuantity).toBe(20 - 8 - 3);
  });

  it('should allow freeQuantity to be negative', async () => {
    const seed = await factories.seedFindAllProductsBase();

    // row1 has totalQuantity = 20, let's make ordered > total
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
      orderedQuantity: 25,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(row1.freeQuantity).toBe(20 - 25 - 0); // -5
    expect(row1.freeQuantity).toBeLessThan(0);
  });

  // --- Scenario 5: Canceled offer returns empty ---
  it('should return empty results for a canceled customer offer', async () => {
    const seed = await factories.seedFindAllProductsBase();

    // Cancel the offer
    await dataSource
      .getRepository('CustomerOffer')
      .update(seed.customerOffer.id, {
        status: CustomerOfferStatus.CANCELED,
      });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  // --- Scenario 6: Non-existent offer ID ---
  it('should return empty results for a non-existent customer offer ID', async () => {
    const result = await service.findAllProducts(99999, defaultPagination);

    expect(result.total).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  // --- Scenario 7: Pagination ---
  describe('pagination', () => {
    it('should respect limit and offset', async () => {
      const seed = await factories.seedFindAllProductsBase();

      // Create 3 more rows (total = 5)
      const product3 = await factories.createProduct();
      const product4 = await factories.createProduct();
      const product5 = await factories.createProduct();
      const spc3 = await factories.createSuppliersProductCatalog(
        seed.supplier.id,
        product3.id,
      );
      const spc4 = await factories.createSuppliersProductCatalog(
        seed.supplier.id,
        product4.id,
      );
      const spc5 = await factories.createSuppliersProductCatalog(
        seed.supplier.id,
        product5.id,
      );
      await factories.createPriceAnalysisRow(seed.pasg.id, spc3.id);
      await factories.createPriceAnalysisRow(seed.pasg.id, spc4.id);
      await factories.createPriceAnalysisRow(seed.pasg.id, spc5.id);

      // limit=2, offset=0
      const page1 = await service.findAllProducts(seed.customerOffer.id, {
        limit: 2,
        offset: 0,
      });
      expect(page1.total).toBe(5);
      expect(page1.results).toHaveLength(2);

      // limit=2, offset=2
      const page2 = await service.findAllProducts(seed.customerOffer.id, {
        limit: 2,
        offset: 2,
      });
      expect(page2.total).toBe(5);
      expect(page2.results).toHaveLength(2);

      // limit=2, offset=4
      const page3 = await service.findAllProducts(seed.customerOffer.id, {
        limit: 2,
        offset: 4,
      });
      expect(page3.total).toBe(5);
      expect(page3.results).toHaveLength(1);

      // limit=0 means no limit
      const all = await service.findAllProducts(seed.customerOffer.id, {
        limit: 0,
        offset: 0,
      });
      expect(all.total).toBe(5);
      expect(all.results).toHaveLength(5);
    });
  });

  // --- Scenario 8: Other offer's supplier orders don't count ---
  it('should not count supplier orders from a different customer offer', async () => {
    const seed = await factories.seedFindAllProductsBase();

    // Create a second, independent offer chain
    const customer2 = await factories.createCustomer();
    const cp3 = await factories.createCustomerContactPerson(customer2.id);
    const cp4 = await factories.createCustomerContactPerson(customer2.id);
    const ppr2 = await factories.createProductProcurementRequest(
      seed.user.id,
      customer2.id,
      cp3.id,
      cp4.id,
    );
    const pa2 = await factories.createPriceAnalysis(ppr2.id);
    const otherOffer = await factories.createCustomerOffer(
      pa2.id,
      customer2.id,
    );

    // Supplier order linked to the OTHER offer
    const soOther = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: otherOffer.id },
    );
    await factories.createSupplierOrderRow(soOther.id, seed.spc1.id, {
      orderedQuantity: 100,
    });

    // Supplier order linked to OUR offer
    const soOurs = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    await factories.createSupplierOrderRow(soOurs.id, seed.spc1.id, {
      orderedQuantity: 5,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(row1.supplierOrderQuantity).toBe(5); // NOT 105
  });

  // --- Scenario 8b: Canceled supplier orders don't count ---
  it('should not count supplier order rows from canceled supplier orders', async () => {
    const seed = await factories.seedFindAllProductsBase();

    // Active supplier order: orderedQuantity = 5
    const soActive = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    await factories.createSupplierOrderRow(soActive.id, seed.spc1.id, {
      orderedQuantity: 5,
    });

    // Canceled supplier order: orderedQuantity = 100
    const soCanceled = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      {
        customerOfferId: seed.customerOffer.id,
        status: SupplierOrderStatus.CANCELED,
      },
    );
    await factories.createSupplierOrderRow(soCanceled.id, seed.spc1.id, {
      orderedQuantity: 100,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(row1.supplierOrderQuantity).toBe(5); // NOT 105
  });

  // --- Scenario 9: Other offer's stock entries don't count ---
  it('should not count stock entries reserved to a different customer offer', async () => {
    const seed = await factories.seedFindAllProductsBase();

    // Create a second offer chain
    const customer2 = await factories.createCustomer();
    const cp3 = await factories.createCustomerContactPerson(customer2.id);
    const cp4 = await factories.createCustomerContactPerson(customer2.id);
    const ppr2 = await factories.createProductProcurementRequest(
      seed.user.id,
      customer2.id,
      cp3.id,
      cp4.id,
    );
    const pa2 = await factories.createPriceAnalysis(ppr2.id);
    const otherOffer = await factories.createCustomerOffer(
      pa2.id,
      customer2.id,
    );

    // Stock entries for OUR offer: 2 (from simple supplier order, manually reserved)
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor = await factories.createSupplierOrderRow(so.id, seed.spc1.id);
    const delivery = await factories.createStockEntryDelivery(sor.id);
    await factories.createStockEntry('SN-OURS-1', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });
    await factories.createStockEntry('SN-OURS-2', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    // Stock entries for OTHER offer: 10
    const soOther = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sorOther = await factories.createSupplierOrderRow(
      soOther.id,
      seed.spc1.id,
    );
    const deliveryOther = await factories.createStockEntryDelivery(sorOther.id);
    for (let i = 0; i < 10; i++) {
      await factories.createStockEntry(`SN-OTHER-${i}`, deliveryOther.id, {
        origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
        customerOfferId: otherOffer.id,
      });
    }

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(row1.reservedQuantity).toBe(2); // NOT 12
  });

  // --- Scenario 10: Multiple supplier groups ---
  it('should return rows from multiple supplier groups in the same price analysis', async () => {
    const user = await factories.createUser();
    const customer = await factories.createCustomer();
    const cp1 = await factories.createCustomerContactPerson(customer.id);
    const cp2 = await factories.createCustomerContactPerson(customer.id);
    const { supplier: supplierA } = await factories.createSupplierWithContact();
    const { supplier: supplierB } = await factories.createSupplierWithContact();
    const product = await factories.createProduct();

    const spcA = await factories.createSuppliersProductCatalog(
      supplierA.id,
      product.id,
    );
    // Different supplier, same product — needs different catalog entry
    const spcB = await factories.createSuppliersProductCatalog(
      supplierB.id,
      product.id,
    );

    const ppr = await factories.createProductProcurementRequest(
      user.id,
      customer.id,
      cp1.id,
      cp2.id,
    );
    const pa = await factories.createPriceAnalysis(ppr.id);
    const pasgA = await factories.createPriceAnalysisSupplierGroup(
      pa.id,
      supplierA.id,
    );
    const pasgB = await factories.createPriceAnalysisSupplierGroup(
      pa.id,
      supplierB.id,
    );
    await factories.createPriceAnalysisRow(pasgA.id, spcA.id, {
      unitPrice: 100,
      quantity: 10,
    });
    await factories.createPriceAnalysisRow(pasgB.id, spcB.id, {
      unitPrice: 120,
      quantity: 10,
    });

    const offer = await factories.createCustomerOffer(pa.id, customer.id);

    const result = await service.findAllProducts(offer.id, defaultPagination);

    expect(result.total).toBe(2);
    const supplierIds = result.results.map((r: any) => r.supplierId);
    expect(supplierIds).toContain(supplierA.id);
    expect(supplierIds).toContain(supplierB.id);
  });

  // --- Scenario 11: Numeric type coercion ---
  it('should return all quantity fields as JavaScript numbers, not strings', async () => {
    const seed = await factories.seedFindAllProductsBase();

    // Supplier order for supplierOrderQuantity
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    await factories.createSupplierOrderRow(so.id, seed.spc1.id, {
      orderedQuantity: 3,
    });

    // Simple supplier order for reservedQuantity
    const soSimple = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor = await factories.createSupplierOrderRow(
      soSimple.id,
      seed.spc1.id,
    );
    const delivery = await factories.createStockEntryDelivery(sor.id);
    await factories.createStockEntry('SN-TYPE-1', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: seed.customerOffer.id,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(typeof row.totalQuantity).toBe('number');
    expect(typeof row.supplierOrderQuantity).toBe('number');
    expect(typeof row.reservedQuantity).toBe('number');
    expect(typeof row.freeQuantity).toBe('number');
  });

  // --- Scenario 12: COALESCE returns 0, not null ---
  it('should return 0 (not null) for quantities when no matching rows exist', async () => {
    const seed = await factories.seedFindAllProductsBase();

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    for (const row of result.results) {
      expect(row.supplierOrderQuantity).toBe(0);
      expect(row.supplierOrderQuantity).not.toBeNull();
      expect(row.reservedQuantity).toBe(0);
      expect(row.reservedQuantity).not.toBeNull();
    }
  });

  // --- Scenario 13: Unreserved stock entries (customerOfferId=NULL) don't count ---
  it('should not count stock entries with customerOfferId=NULL in reservedQuantity', async () => {
    const seed = await factories.seedFindAllProductsBase();

    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
    );
    const sor = await factories.createSupplierOrderRow(so.id, seed.spc1.id);
    const delivery = await factories.createStockEntryDelivery(sor.id);

    // Stock entries WITHOUT customerOfferId (unreserved)
    await factories.createStockEntry('SN-UNRESERVED-1', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: undefined,
    });
    await factories.createStockEntry('SN-UNRESERVED-2', delivery.id, {
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
      customerOfferId: undefined,
    });

    const result = await service.findAllProducts(
      seed.customerOffer.id,
      defaultPagination,
    );

    const row1 = result.results.find((r: any) => r.id === seed.row1.id)!;
    expect(row1.reservedQuantity).toBe(0);
  });
});
