import { DataSource } from 'typeorm';
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
import {
  CustomerOffer,
  CustomerOfferStatus,
} from '../../src/modules/customer-offer/entities/customer-offer.entity';
import {
  SupplierOrder,
  SupplierOrderStatus,
} from '../../src/modules/supplier-order/entities/supplier-order.entity';
import { SupplierOrderRow } from '../../src/modules/supplier-order/entities/supplier-order-row.entity';
import { StockEntryDelivery } from '../../src/modules/stock-entry/entities/stock-entry-delivery.entity';
import {
  StockEntry,
  StockEntryOrigin,
} from '../../src/modules/stock-entry/entities/stock-entry.entity';

let counter = 0;
function unique(): number {
  return ++counter;
}

export function resetFactoryCounter(): void {
  counter = 0;
}

export class TestFactories {
  constructor(private readonly dataSource: DataSource) {}

  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const n = unique();
    const repo = this.dataSource.getRepository(User);
    return repo.save(
      repo.create({
        email: `user${n}@test.com`,
        password: 'password123',
        role: 'admin',
        firstName: `First${n}`,
        lastName: `Last${n}`,
        ...overrides,
      }),
    );
  }

  async createCustomer(overrides: Partial<Customer> = {}): Promise<Customer> {
    const n = unique();
    const repo = this.dataSource.getRepository(Customer);
    return repo.save(
      repo.create({
        name: `Customer ${n}`,
        address: `Address ${n}`,
        uniqueRegistrationCode: `URC-${n}`,
        tradeRegisterNumber: `TRN-${n}`,
        domain: 'Technology',
        ...overrides,
      }),
    );
  }

  async createCustomerContactPerson(
    customerId: number,
    overrides: Partial<CustomerContactPerson> = {},
  ): Promise<CustomerContactPerson> {
    const n = unique();
    const repo = this.dataSource.getRepository(CustomerContactPerson);
    return repo.save(
      repo.create({
        firstName: `ContactFirst${n}`,
        lastName: `ContactLast${n}`,
        position: 'Manager',
        email: `contact${n}@test.com`,
        phone: `+4070000${String(n).padStart(4, '0')}`,
        customerId,
        ...overrides,
      }),
    );
  }

  async createProduct(overrides: Partial<Product> = {}): Promise<Product> {
    const n = unique();
    const repo = this.dataSource.getRepository(Product);
    return repo.save(
      repo.create({
        name: `Product ${n}`,
        description: `Description ${n}`,
        category: 'Electronics',
        manufacturer: 'TestMfr',
        manufacturerCode: `MFR-${n}`,
        hsCode: `HS-${n}`,
        taricCode: `TAR-${n}`,
        unitOfMeasurement: 'bucati',
        stock: 100,
        reservedStock: 0,
        ...overrides,
      }),
    );
  }

  /**
   * Creates a Supplier AND its SupplierContactPerson together to handle
   * the circular FK (Supplier -> SupplierContactPerson -> Supplier).
   */
  async createSupplierWithContact(
    supplierOverrides: Partial<Supplier> = {},
    contactOverrides: Partial<SupplierContactPerson> = {},
  ): Promise<{ supplier: Supplier; contactPerson: SupplierContactPerson }> {
    const n = unique();

    // Temporarily disable FK triggers on suppliers to break the circular dependency
    await this.dataSource.query('ALTER TABLE "suppliers" DISABLE TRIGGER ALL');

    const supplierRepo = this.dataSource.getRepository(Supplier);
    const supplier = await supplierRepo.save(
      supplierRepo.create({
        name: `Supplier ${n}`,
        address: `Addr ${n}`,
        country: 'Romania',
        fiscalCode: `FC-${n}`,
        uniqueRegistrationCode: `SUP-URC-${n}`,
        currency: 'EUR',
        pickUpAddress: `Pickup ${n}`,
        pickupContactPersonId: 0 as any,
        ...supplierOverrides,
      }),
    );

    await this.dataSource.query('ALTER TABLE "suppliers" ENABLE TRIGGER ALL');

    const contactRepo = this.dataSource.getRepository(SupplierContactPerson);
    const contactPerson = await contactRepo.save(
      contactRepo.create({
        firstName: `SupContact${n}`,
        lastName: `SupLast${n}`,
        position: 'Sales',
        email: `supcontact${n}@test.com`,
        phone: `+4071100${String(n).padStart(4, '0')}`,
        supplierId: supplier.id,
        ...contactOverrides,
      }),
    );

    await supplierRepo.update(supplier.id, {
      pickupContactPersonId: contactPerson.id,
    });

    supplier.pickupContactPersonId = contactPerson.id;
    return { supplier, contactPerson };
  }

  async createSuppliersProductCatalog(
    supplierId: number,
    productId: number,
    overrides: Partial<SuppliersProductCatalog> = {},
  ): Promise<SuppliersProductCatalog> {
    const n = unique();
    const repo = this.dataSource.getRepository(SuppliersProductCatalog);
    return repo.save(
      repo.create({
        supplierId,
        productId,
        supplierCode: `SC-${n}`,
        ...overrides,
      }),
    );
  }

  async createProductProcurementRequest(
    assignedUserId: number,
    customerId: number,
    customerContactPersonId: number,
    ccCustomerContactPersonId: number,
    overrides: Partial<ProductProcurementRequest> = {},
  ): Promise<ProductProcurementRequest> {
    const n = unique();
    const repo = this.dataSource.getRepository(ProductProcurementRequest);
    return repo.save(
      repo.create({
        status: 'IN_PROGRESS' as any,
        category: 'Electronics',
        generationMethod: 'email',
        receivingMethod: 'initiata de client',
        projectName: `Project ${n}`,
        responseDeadlineDate: new Date('2026-12-31'),
        assignedUserId,
        customerId,
        customerContactPersonId,
        ccCustomerContactPersonId,
        ...overrides,
      }),
    );
  }

  async createPriceAnalysis(
    productProcurementRequestId: number,
    overrides: Partial<PriceAnalysis> = {},
  ): Promise<PriceAnalysis> {
    const repo = this.dataSource.getRepository(PriceAnalysis);
    return repo.save(
      repo.create({
        projectDiscount: 0,
        vatRate: 21,
        eurToRonExchangeRate: 4.97,
        usdToRonExchangeRate: 4.56,
        gbpToRonExchangeRate: 5.78,
        productProcurementRequestId,
        ...overrides,
      }),
    );
  }

  async createPriceAnalysisSupplierGroup(
    priceAnalysisId: number,
    supplierId: number,
    overrides: Partial<PriceAnalysisSupplierGroup> = {},
  ): Promise<PriceAnalysisSupplierGroup> {
    const repo = this.dataSource.getRepository(PriceAnalysisSupplierGroup);
    return repo.save(
      repo.create({
        priceAnalysisId,
        supplierId,
        transportationCost: 100,
        importExportCost: 50,
        financialCost: 25,
        ...overrides,
      }),
    );
  }

  async createPriceAnalysisRow(
    priceAnalysisSupplierGroupId: number,
    suppliersProductCatalogId: number,
    overrides: Partial<PriceAnalysisRow> = {},
  ): Promise<PriceAnalysisRow> {
    const repo = this.dataSource.getRepository(PriceAnalysisRow);
    return repo.save(
      repo.create({
        priceAnalysisSupplierGroupId,
        suppliersProductCatalogId,
        unitPrice: 50.0,
        quantity: 10,
        productDiscount: 5,
        customerDiscount: 3,
        ...overrides,
      }),
    );
  }

  async createCustomerOffer(
    priceAnalysisId: number,
    customerId: number,
    overrides: Partial<CustomerOffer> = {},
  ): Promise<CustomerOffer> {
    const repo = this.dataSource.getRepository(CustomerOffer);
    return repo.save(
      repo.create({
        status: CustomerOfferStatus.IN_PROGRESS,
        priceAnalysisId,
        customerId,
        ...overrides,
      }),
    );
  }

  async createSupplierOrder(
    supplierId: number,
    userInChargeId: number,
    assignedUserId: number,
    overrides: Partial<SupplierOrder> = {},
  ): Promise<SupplierOrder> {
    const n = unique();
    const repo = this.dataSource.getRepository(SupplierOrder);
    return repo.save(
      repo.create({
        status: SupplierOrderStatus.CREATED,
        supplierOrderRegistrationNumber: `SORN-${n}`,
        orderAcknowledgmentNumber: `OAN-${n}`,
        orderAcknowledgmentDate: new Date('2026-01-15'),
        endUser: 'Test End User',
        partialShipment: false,
        incoterm2010: 'FOB',
        meanOfShipment: 'Truck',
        requestedDeliveryDate: '2026-03-01',
        remarks: 'Test remarks',
        termsAndMeanOfPayment: 'Net 30',
        pointOfSales: 'Bucharest',
        otherInstructions: 'None',
        supplierId,
        userInChargeId,
        assignedUserId,
        ...overrides,
      }),
    );
  }

  async createSupplierOrderRow(
    supplierOrderId: number,
    suppliersProductCatalogId: number,
    overrides: Partial<SupplierOrderRow> = {},
  ): Promise<SupplierOrderRow> {
    const repo = this.dataSource.getRepository(SupplierOrderRow);
    return repo.save(
      repo.create({
        supplierOrderId,
        suppliersProductCatalogId,
        unitPrice: 45.0,
        orderedQuantity: 5,
        ...overrides,
      }),
    );
  }

  async createStockEntryDelivery(
    supplierOrderRowId: number,
    overrides: Partial<StockEntryDelivery> = {},
  ): Promise<StockEntryDelivery> {
    const repo = this.dataSource.getRepository(StockEntryDelivery);
    return repo.save(
      repo.create({
        supplierOrderRowId,
        quantity: 5,
        estimatedShipmentDate: new Date('2026-02-15'),
        ...overrides,
      }),
    );
  }

  async createStockEntry(
    serialNumber: string,
    stockEntryDeliveryId: number,
    overrides: Partial<StockEntry> = {},
  ): Promise<StockEntry> {
    const repo = this.dataSource.getRepository(StockEntry);
    return repo.save(
      repo.create({
        serialNumber,
        stockEntryDeliveryId,
        origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
        ...overrides,
      }),
    );
  }

  /**
   * High-level helper: creates base entities for supplier order tests.
   * Returns user, customer, supplier, products, catalog entries, and a customer offer.
   */
  async seedSupplierOrderBase() {
    const user = await this.createUser();
    const customer = await this.createCustomer();
    const cp1 = await this.createCustomerContactPerson(customer.id);
    const cp2 = await this.createCustomerContactPerson(customer.id);
    const { supplier, contactPerson } = await this.createSupplierWithContact();
    const product1 = await this.createProduct({
      name: 'Widget A',
      manufacturerCode: 'WA-001',
    });
    const product2 = await this.createProduct({
      name: 'Widget B',
      manufacturerCode: 'WB-002',
    });
    const spc1 = await this.createSuppliersProductCatalog(
      supplier.id,
      product1.id,
    );
    const spc2 = await this.createSuppliersProductCatalog(
      supplier.id,
      product2.id,
    );

    const ppr = await this.createProductProcurementRequest(
      user.id,
      customer.id,
      cp1.id,
      cp2.id,
    );
    const priceAnalysis = await this.createPriceAnalysis(ppr.id);
    const customerOffer = await this.createCustomerOffer(
      priceAnalysis.id,
      customer.id,
    );

    return {
      user,
      customer,
      contactPerson,
      supplier,
      product1,
      product2,
      spc1,
      spc2,
      customerOffer,
    };
  }

  /**
   * High-level helper: creates the full entity chain needed for findAllProducts tests.
   * Returns all entities for use in assertions.
   */
  async seedFindAllProductsBase() {
    const user = await this.createUser();
    const customer = await this.createCustomer();
    const cp1 = await this.createCustomerContactPerson(customer.id);
    const cp2 = await this.createCustomerContactPerson(customer.id);
    const { supplier } = await this.createSupplierWithContact();
    const product1 = await this.createProduct({
      name: 'Widget A',
      manufacturerCode: 'WA-001',
    });
    const product2 = await this.createProduct({
      name: 'Widget B',
      manufacturerCode: 'WB-002',
    });

    const spc1 = await this.createSuppliersProductCatalog(
      supplier.id,
      product1.id,
    );
    const spc2 = await this.createSuppliersProductCatalog(
      supplier.id,
      product2.id,
    );

    const ppr = await this.createProductProcurementRequest(
      user.id,
      customer.id,
      cp1.id,
      cp2.id,
    );
    const priceAnalysis = await this.createPriceAnalysis(ppr.id);
    const pasg = await this.createPriceAnalysisSupplierGroup(
      priceAnalysis.id,
      supplier.id,
    );
    const row1 = await this.createPriceAnalysisRow(pasg.id, spc1.id, {
      unitPrice: 100,
      quantity: 20,
      productDiscount: 10,
      customerDiscount: 5,
    });
    const row2 = await this.createPriceAnalysisRow(pasg.id, spc2.id, {
      unitPrice: 200,
      quantity: 15,
      productDiscount: 8,
      customerDiscount: 4,
    });

    const customerOffer = await this.createCustomerOffer(
      priceAnalysis.id,
      customer.id,
    );

    return {
      user,
      customer,
      supplier,
      product1,
      product2,
      spc1,
      spc2,
      ppr,
      priceAnalysis,
      pasg,
      row1,
      row2,
      customerOffer,
    };
  }
}
