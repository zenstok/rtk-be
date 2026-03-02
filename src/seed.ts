import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from './modules/app.module';

import { User } from './modules/user/entities/user.entity';
import { Customer } from './modules/customer/entities/customer.entity';
import { CustomerContactPerson } from './modules/customer/entities/customer-contact-person.entity';
import { Product } from './modules/product/entities/product.entity';
import { Supplier } from './modules/supplier/entities/supplier.entity';
import { SupplierContactPerson } from './modules/supplier/entities/supplier-contact-person.entity';
import { SuppliersProductCatalog } from './modules/suppliers-product-catalog/entities/suppliers-product-catalog.entity';
import { ProductProcurementRequest } from './modules/product-procurement-request/entities/product-procurement-request.entity';
import { PriceAnalysis } from './modules/price-analysis/entities/price-analysis.entity';
import { PriceAnalysisSupplierGroup } from './modules/price-analysis/entities/price-analysis-supplier-group.entity';
import { PriceAnalysisRow } from './modules/price-analysis/entities/price-analysis-row.entity';
import {
  CustomerOffer,
  CustomerOfferStatus,
} from './modules/customer-offer/entities/customer-offer.entity';
import {
  SupplierOrder,
  SupplierOrderStatus,
} from './modules/supplier-order/entities/supplier-order.entity';
import { SupplierOrderRow } from './modules/supplier-order/entities/supplier-order-row.entity';
import { StockEntryDelivery } from './modules/stock-entry/entities/stock-entry-delivery.entity';
import {
  StockEntry,
  StockEntryOrigin,
} from './modules/stock-entry/entities/stock-entry.entity';
import {
  StockExit,
  StockExitSource,
} from './modules/stock-exit/entities/stock-exit.entity';
import { BnrApiHistory } from './modules/bnr-api/entities/bnr-api-history.entity';
import { Role } from './modules/auth/constants/role.enum';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);

  console.log('Truncating all tables...');
  await ds.query(`
    TRUNCATE TABLE
      stock_exits,
      stock_entries,
      stock_entry_deliveries,
      supplier_order_rows,
      supplier_orders,
      customer_offers,
      price_analysis_rows,
      price_analysis_supplier_groups,
      price_analyses,
      product_procurement_requests,
      suppliers_product_catalog,
      supplier_contact_persons,
      customer_contact_persons,
      files,
      bnr_api_history,
      auth_refresh_tokens,
      products,
      customers,
      users
    CASCADE
  `);
  // Reset ID sequences after truncation
  await ds.query(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE ' || quote_ident(r.sequencename) || ' RESTART WITH 1';
      END LOOP;
    END $$;
  `);

  // Also need to reset supplier table separately (circular FK)
  await ds.query('ALTER TABLE "suppliers" DISABLE TRIGGER ALL');
  await ds.query('TRUNCATE TABLE suppliers CASCADE');
  await ds.query('ALTER TABLE "suppliers" ENABLE TRIGGER ALL');

  const hashedPassword = await bcrypt.hash('Password1!', 12);

  // ──────────────────────────────────────────────
  // Phase 1: Independent entities
  // ──────────────────────────────────────────────
  console.log('Phase 1: Users, Customers, Products, BNR rates...');

  const userRepo = ds.getRepository(User);
  const users = await userRepo.save([
    userRepo.create({
      email: 'admin@romtek.ro',
      password: hashedPassword,
      role: Role.Admin,
      firstName: 'Alexandru',
      lastName: 'Popescu',
    }),
    userRepo.create({
      email: 'maria@romtek.ro',
      password: hashedPassword,
      role: Role.User,
      firstName: 'Maria',
      lastName: 'Ionescu',
    }),
    userRepo.create({
      email: 'andrei@romtek.ro',
      password: hashedPassword,
      role: Role.User,
      firstName: 'Andrei',
      lastName: 'Dumitrescu',
    }),
  ]);
  const [admin, maria, andrei] = users;

  const customerRepo = ds.getRepository(Customer);
  const customers = await customerRepo.save([
    customerRepo.create({
      name: 'Electrica SA',
      address: 'Str. Grigore Alexandrescu 9, Bucuresti',
      uniqueRegistrationCode: 'RO13267221',
      tradeRegisterNumber: 'J40/7845/2000',
      domain: 'Energie',
      bank: 'BCR',
      iban: 'RO49AAAA1B31007593840000',
    }),
    customerRepo.create({
      name: 'Dacia Automobile SRL',
      address: 'Calea Floreasca 169A, Bucuresti',
      uniqueRegistrationCode: 'RO18aborator',
      tradeRegisterNumber: 'J40/12345/2005',
      domain: 'Automotive',
      bank: 'BRD',
      iban: 'RO15BRDE445SV12345678900',
    }),
    customerRepo.create({
      name: 'Siemens Romania SRL',
      address: 'Bd. Dimitrie Pompeiu 6, Bucuresti',
      uniqueRegistrationCode: 'RO8085609',
      tradeRegisterNumber: 'J40/56789/1998',
      domain: 'Automatizari industriale',
      euid: 'ROONRC.J40/56789/1998',
      bank: 'ING Bank',
      iban: 'RO66INGB0001000123456789',
      bic: 'INGBROBU',
    }),
  ]);
  const [electrica, dacia, siemens] = customers;

  const productRepo = ds.getRepository(Product);
  const products = await productRepo.save([
    productRepo.create({
      name: 'Condensator ceramic 100nF',
      description: 'Condensator ceramic MLCC 100nF 50V X7R 0805',
      category: 'Componente pasive',
      manufacturer: 'Murata',
      manufacturerCode: 'GRM21BR71H104KA01L',
      hsCode: '8532.24',
      taricCode: '8532240000',
      unitOfMeasurement: 'bucati',
      stock: 0,
      reservedStock: 0,
    }),
    productRepo.create({
      name: 'Rezistor SMD 10kΩ',
      description: 'Rezistor chip SMD 10kΩ 1/4W 1% 0805',
      category: 'Componente pasive',
      manufacturer: 'Yageo',
      manufacturerCode: 'RC0805FR-0710KL',
      hsCode: '8533.21',
      taricCode: '8533210000',
      unitOfMeasurement: 'bucati',
      stock: 0,
      reservedStock: 0,
    }),
    productRepo.create({
      name: 'Microcontroler STM32F407VGT6',
      description: 'ARM Cortex-M4 168MHz 1MB Flash LQFP-100',
      category: 'Circuite integrate',
      manufacturer: 'STMicroelectronics',
      manufacturerCode: 'STM32F407VGT6',
      hsCode: '8542.31',
      taricCode: '8542310000',
      unitOfMeasurement: 'bucati',
      stock: 0,
      reservedStock: 0,
    }),
    productRepo.create({
      name: 'Conector USB Type-C',
      description: 'Conector USB Type-C 24-pin SMD cu fixare',
      category: 'Conectori',
      manufacturer: 'Molex',
      manufacturerCode: '105450-0101',
      hsCode: '8536.69',
      taricCode: '8536690000',
      unitOfMeasurement: 'bucati',
      stock: 0,
      reservedStock: 0,
    }),
    productRepo.create({
      name: 'Cablu panglica FFC 20pin',
      description: 'Cablu flexibil FFC 20-pin 0.5mm pas 200mm lungime',
      category: 'Cabluri',
      manufacturer: 'Würth Elektronik',
      manufacturerCode: '687720050002',
      hsCode: '8544.42',
      taricCode: '8544420000',
      unitOfMeasurement: 'bucati',
      stock: 0,
      reservedStock: 0,
    }),
    productRepo.create({
      name: 'PCB prototipare dublu strat',
      description: 'Placă circuit imprimat dublu strat FR4 1.6mm 100x100mm',
      category: 'PCB',
      manufacturer: 'JLCPCB',
      manufacturerCode: 'PCB-DS-FR4-100',
      hsCode: '8534.00',
      taricCode: '8534000000',
      unitOfMeasurement: 'bucati',
      stock: 0,
      reservedStock: 0,
    }),
  ]);
  const [condensator, rezistor, stm32, usbConnector, cableFfc, pcb] = products;

  const bnrRepo = ds.getRepository(BnrApiHistory);
  await bnrRepo.save(
    bnrRepo.create({
      publishingDate: '2026-03-02',
      eurToRonExchangeRate: 4.9745,
      usdToRonExchangeRate: 4.5521,
      gbpToRonExchangeRate: 5.8012,
    }),
  );

  // ──────────────────────────────────────────────
  // Phase 2: Contact persons, Suppliers (circular FK)
  // ──────────────────────────────────────────────
  console.log('Phase 2: Contact persons, Suppliers...');

  const ccpRepo = ds.getRepository(CustomerContactPerson);
  const contactPersons = await ccpRepo.save([
    ccpRepo.create({
      firstName: 'Ion',
      lastName: 'Marinescu',
      position: 'Director Achizitii',
      email: 'ion.marinescu@electrica.ro',
      phone: '+40721000001',
      customerId: electrica.id,
    }),
    ccpRepo.create({
      firstName: 'Elena',
      lastName: 'Vasilescu',
      position: 'Inginer Proiect',
      email: 'elena.vasilescu@electrica.ro',
      phone: '+40721000002',
      customerId: electrica.id,
    }),
    ccpRepo.create({
      firstName: 'Mihai',
      lastName: 'Constantinescu',
      position: 'Manager Tehnic',
      email: 'mihai.c@dacia.ro',
      phone: '+40722000001',
      customerId: dacia.id,
    }),
    ccpRepo.create({
      firstName: 'Ana',
      lastName: 'Popa',
      position: 'Inginer Calitate',
      email: 'ana.popa@dacia.ro',
      phone: '+40722000002',
      customerId: dacia.id,
    }),
    ccpRepo.create({
      firstName: 'Stefan',
      lastName: 'Neagu',
      position: 'Director Proiect',
      email: 'stefan.neagu@siemens.ro',
      phone: '+40723000001',
      customerId: siemens.id,
    }),
    ccpRepo.create({
      firstName: 'Cristina',
      lastName: 'Dragomir',
      position: 'Specialist Achizitii',
      email: 'cristina.d@siemens.ro',
      phone: '+40723000002',
      customerId: siemens.id,
    }),
  ]);
  const [ionM, elenaV, mihaiC, anaP, stefanN, cristinaD] = contactPersons;

  // Suppliers with circular FK handling
  const supplierRepo = ds.getRepository(Supplier);
  const scpRepo = ds.getRepository(SupplierContactPerson);

  async function createSupplierWithContact(
    supplierData: Partial<Supplier>,
    contactData: Partial<SupplierContactPerson>,
  ) {
    await ds.query('ALTER TABLE "suppliers" DISABLE TRIGGER ALL');
    const supplier = await supplierRepo.save(
      supplierRepo.create({
        ...supplierData,
        pickupContactPersonId: 0 as any,
      }),
    );
    await ds.query('ALTER TABLE "suppliers" ENABLE TRIGGER ALL');

    const contact = await scpRepo.save(
      scpRepo.create({ ...contactData, supplierId: supplier.id }),
    );
    await supplierRepo.update(supplier.id, {
      pickupContactPersonId: contact.id,
    });
    supplier.pickupContactPersonId = contact.id;
    return { supplier, contact };
  }

  const { supplier: murata, contact: murataContact } =
    await createSupplierWithContact(
      {
        name: 'Murata Manufacturing Co.',
        address: '10-1, Higashikotari 1-chome, Nagaokakyo-shi, Kyoto',
        country: 'Japan',
        fiscalCode: 'JP-MURATA-001',
        uniqueRegistrationCode: 'SUP-MURATA-001',
        currency: 'EUR',
        pickUpAddress: 'Murata Europe BV, Eindhoven, Netherlands',
      },
      {
        firstName: 'Takeshi',
        lastName: 'Yamamoto',
        position: 'Sales Manager EMEA',
        email: 'takeshi.y@murata.com',
        phone: '+31401234567',
      },
    );

  const { supplier: stMicro, contact: stMicroContact } =
    await createSupplierWithContact(
      {
        name: 'STMicroelectronics NV',
        address: '39, Chemin du Champ des Filles, Geneva',
        country: 'Switzerland',
        fiscalCode: 'CH-STM-002',
        uniqueRegistrationCode: 'SUP-STM-002',
        currency: 'EUR',
        pickUpAddress: 'STMicro Distribution, Milan, Italy',
      },
      {
        firstName: 'Marco',
        lastName: 'Rossi',
        position: 'Account Manager',
        email: 'marco.rossi@st.com',
        phone: '+39023456789',
      },
    );

  const { supplier: molex, contact: molexContact } =
    await createSupplierWithContact(
      {
        name: 'Molex LLC',
        address: '2222 Wellington Court, Lisle, Illinois',
        country: 'USA',
        fiscalCode: 'US-MOLEX-003',
        uniqueRegistrationCode: 'SUP-MOLEX-003',
        currency: 'USD',
        pickUpAddress: 'Molex Europe, Shannon, Ireland',
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        position: 'Regional Sales Director',
        email: 'john.smith@molex.com',
        phone: '+353612345678',
      },
    );

  // ──────────────────────────────────────────────
  // Phase 3: Supplier product catalog
  // ──────────────────────────────────────────────
  console.log('Phase 3: Supplier product catalog...');

  const spcRepo = ds.getRepository(SuppliersProductCatalog);
  const catalogs = await spcRepo.save([
    // Murata: condensator, rezistor, cablu, pcb
    spcRepo.create({
      supplierId: murata.id,
      productId: condensator.id,
      supplierCode: 'MUR-CAP-100NF',
      tariffRate: 3.5,
    }),
    spcRepo.create({
      supplierId: murata.id,
      productId: rezistor.id,
      supplierCode: 'MUR-RES-10K',
      tariffRate: 3.5,
    }),
    spcRepo.create({
      supplierId: murata.id,
      productId: cableFfc.id,
      supplierCode: 'MUR-FFC-20P',
      tariffRate: 4.0,
    }),
    spcRepo.create({
      supplierId: murata.id,
      productId: pcb.id,
      supplierCode: 'MUR-PCB-DS',
      tariffRate: 4.0,
    }),
    // STMicro: stm32, condensator, rezistor, pcb
    spcRepo.create({
      supplierId: stMicro.id,
      productId: stm32.id,
      supplierCode: 'STM-MCU-F407',
      tariffRate: 0,
    }),
    spcRepo.create({
      supplierId: stMicro.id,
      productId: condensator.id,
      supplierCode: 'STM-CAP-100NF',
      tariffRate: 3.5,
    }),
    spcRepo.create({
      supplierId: stMicro.id,
      productId: rezistor.id,
      supplierCode: 'STM-RES-10K',
      tariffRate: 3.5,
    }),
    spcRepo.create({
      supplierId: stMicro.id,
      productId: pcb.id,
      supplierCode: 'STM-PCB-DS',
      tariffRate: 4.0,
    }),
    // Molex: usbConnector, cablu, condensator, rezistor
    spcRepo.create({
      supplierId: molex.id,
      productId: usbConnector.id,
      supplierCode: 'MOL-USBC-24P',
      tariffRate: 2.5,
    }),
    spcRepo.create({
      supplierId: molex.id,
      productId: cableFfc.id,
      supplierCode: 'MOL-FFC-20P',
      tariffRate: 2.5,
    }),
    spcRepo.create({
      supplierId: molex.id,
      productId: condensator.id,
      supplierCode: 'MOL-CAP-100NF',
      tariffRate: 3.0,
    }),
    spcRepo.create({
      supplierId: molex.id,
      productId: rezistor.id,
      supplierCode: 'MOL-RES-10K',
      tariffRate: 3.0,
    }),
  ]);
  const [
    murCap,
    murRes,
    murFfc,
    murPcb,
    stmMcu,
    stmCap,
    stmRes,
    stmPcb,
    molUsbc,
    molFfc,
    molCap,
    molRes,
  ] = catalogs;

  // ──────────────────────────────────────────────
  // Phase 4: Procurement requests & price analysis
  // ──────────────────────────────────────────────
  console.log('Phase 4: PPRs, Price Analyses...');

  const pprRepo = ds.getRepository(ProductProcurementRequest);
  const pprs = await pprRepo.save([
    // PPR 1: IN_PROGRESS (no price analysis yet)
    pprRepo.create({
      status: 'IN_PROGRESS' as any,
      category: 'Componente pasive',
      generationMethod: 'email',
      receivingMethod: 'initiata de client',
      projectName: 'Statie incarcare EV - Electrica',
      projectCode: 'EV-2026-001',
      description: 'Componente pentru statii de incarcare vehicule electrice',
      responseDeadlineDate: new Date('2026-04-15'),
      assignedUserId: maria.id,
      customerId: electrica.id,
      customerContactPersonId: ionM.id,
      ccCustomerContactPersonId: elenaV.id,
    }),
    // PPR 2: OFFER_CREATED
    pprRepo.create({
      status: 'OFFER_CREATED' as any,
      category: 'Circuite integrate',
      generationMethod: 'telefon',
      receivingMethod: 'generata intern',
      projectName: 'Sistem control motor - Dacia',
      projectCode: 'DCM-2026-003',
      description: 'MCU-uri si componente pentru ECU-ul nou',
      responseDeadlineDate: new Date('2026-05-01'),
      assignedUserId: andrei.id,
      customerId: dacia.id,
      customerContactPersonId: mihaiC.id,
      ccCustomerContactPersonId: anaP.id,
    }),
    // PPR 3: OFFER_ACCEPTED (full lifecycle)
    pprRepo.create({
      status: 'OFFER_ACCEPTED' as any,
      category: 'Conectori',
      generationMethod: 'email',
      receivingMethod: 'initiata de client',
      projectName: 'Automatizare linie productie - Siemens',
      projectCode: 'SIE-AUT-2026',
      description: 'Conectori USB-C si cabluri pentru panoul de control',
      responseDeadlineDate: new Date('2026-03-20'),
      rfq: 'RFQ-SIE-2026-0042',
      assignedUserId: admin.id,
      customerId: siemens.id,
      customerContactPersonId: stefanN.id,
      ccCustomerContactPersonId: cristinaD.id,
    }),
  ]);
  const [ppr1, ppr2, ppr3] = pprs;

  const paRepo = ds.getRepository(PriceAnalysis);
  const priceAnalyses = await paRepo.save([
    // PA for PPR 2 (Dacia)
    paRepo.create({
      productProcurementRequestId: ppr2.id,
      projectDiscount: 5,
      vatRate: 19,
      eurToRonExchangeRate: 4.9745,
      usdToRonExchangeRate: 4.5521,
      gbpToRonExchangeRate: 5.8012,
    }),
    // PA for PPR 3 (Siemens)
    paRepo.create({
      productProcurementRequestId: ppr3.id,
      projectDiscount: 8,
      vatRate: 19,
      eurToRonExchangeRate: 4.9745,
      usdToRonExchangeRate: 4.5521,
      gbpToRonExchangeRate: 5.8012,
    }),
  ]);
  const [paDacia, paSiemens] = priceAnalyses;

  const pasgRepo = ds.getRepository(PriceAnalysisSupplierGroup);
  const supplierGroups = await pasgRepo.save([
    // Dacia PA: STMicro + Murata
    pasgRepo.create({
      priceAnalysisId: paDacia.id,
      supplierId: stMicro.id,
      transportationCost: 150,
      importExportCost: 0,
      financialCost: 30,
    }),
    pasgRepo.create({
      priceAnalysisId: paDacia.id,
      supplierId: murata.id,
      transportationCost: 200,
      importExportCost: 80,
      financialCost: 25,
    }),
    // Siemens PA: Molex + Murata
    pasgRepo.create({
      priceAnalysisId: paSiemens.id,
      supplierId: molex.id,
      transportationCost: 350,
      importExportCost: 120,
      financialCost: 50,
    }),
    pasgRepo.create({
      priceAnalysisId: paSiemens.id,
      supplierId: murata.id,
      transportationCost: 180,
      importExportCost: 60,
      financialCost: 20,
    }),
  ]);
  const [sgDaciaStm, sgDaciaMur, sgSieMolex, sgSieMur] = supplierGroups;

  const parRepo = ds.getRepository(PriceAnalysisRow);
  await parRepo.save([
    // Dacia / STMicro: stm32 + condensator
    parRepo.create({
      priceAnalysisSupplierGroupId: sgDaciaStm.id,
      suppliersProductCatalogId: stmMcu.id,
      unitPrice: 12.5,
      quantity: 500,
      productDiscount: 10,
      customerDiscount: 5,
    }),
    parRepo.create({
      priceAnalysisSupplierGroupId: sgDaciaStm.id,
      suppliersProductCatalogId: stmCap.id,
      unitPrice: 0.05,
      quantity: 5000,
      productDiscount: 15,
      customerDiscount: 8,
    }),
    // Dacia / Murata: condensator + rezistor
    parRepo.create({
      priceAnalysisSupplierGroupId: sgDaciaMur.id,
      suppliersProductCatalogId: murCap.id,
      unitPrice: 0.04,
      quantity: 5000,
      productDiscount: 12,
      customerDiscount: 6,
    }),
    parRepo.create({
      priceAnalysisSupplierGroupId: sgDaciaMur.id,
      suppliersProductCatalogId: murRes.id,
      unitPrice: 0.02,
      quantity: 10000,
      productDiscount: 10,
      customerDiscount: 5,
    }),
    // Siemens / Molex: usb-c + cablu
    parRepo.create({
      priceAnalysisSupplierGroupId: sgSieMolex.id,
      suppliersProductCatalogId: molUsbc.id,
      unitPrice: 1.85,
      quantity: 200,
      productDiscount: 8,
      customerDiscount: 4,
    }),
    parRepo.create({
      priceAnalysisSupplierGroupId: sgSieMolex.id,
      suppliersProductCatalogId: molFfc.id,
      unitPrice: 0.95,
      quantity: 300,
      productDiscount: 5,
      customerDiscount: 3,
    }),
    // Siemens / Murata: condensator + cablu
    parRepo.create({
      priceAnalysisSupplierGroupId: sgSieMur.id,
      suppliersProductCatalogId: murCap.id,
      unitPrice: 0.045,
      quantity: 2000,
      productDiscount: 10,
      customerDiscount: 5,
    }),
    parRepo.create({
      priceAnalysisSupplierGroupId: sgSieMur.id,
      suppliersProductCatalogId: murFfc.id,
      unitPrice: 0.85,
      quantity: 300,
      productDiscount: 6,
      customerDiscount: 3,
    }),
  ]);

  // ──────────────────────────────────────────────
  // Phase 5: Customer offers & Supplier orders
  // ──────────────────────────────────────────────
  console.log('Phase 5: Customer offers, Supplier orders...');

  const coRepo = ds.getRepository(CustomerOffer);
  const offers = await coRepo.save([
    // Dacia offer: IN_PROGRESS
    coRepo.create({
      priceAnalysisId: paDacia.id,
      customerId: dacia.id,
      status: CustomerOfferStatus.IN_PROGRESS,
      closeProbability: 60,
    }),
    // Siemens offer: CONFIRMED_CUSTOMER_ORDER
    coRepo.create({
      priceAnalysisId: paSiemens.id,
      customerId: siemens.id,
      status: CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER,
      customerOrderReceivingMethod: 'email',
      customerOrderNumber: 'PO-SIE-2026-0042',
      closeDate: new Date('2026-02-28'),
      closeProbability: 100,
    }),
  ]);
  const [offerDacia, offerSiemens] = offers;

  const soRepo = ds.getRepository(SupplierOrder);
  const supplierOrders = await soRepo.save([
    // Order 1: CREATED (for Dacia, no customer offer link — simple order)
    soRepo.create({
      status: SupplierOrderStatus.CREATED,
      supplierOrderRegistrationNumber: 'SORN-2026-001',
      orderAcknowledgmentNumber: 'OAN-MUR-001',
      orderAcknowledgmentDate: new Date('2026-02-10'),
      endUser: 'Dacia Automobile SRL',
      partialShipment: false,
      incoterm2010: 'DAP',
      meanOfShipment: 'Air freight',
      requestedDeliveryDate: '2026-04-01',
      remarks: 'Urgent - production line waiting',
      termsAndMeanOfPayment: 'Net 60 - bank transfer',
      pointOfSales: 'Bucuresti',
      otherInstructions: 'Include test reports',
      supplierId: murata.id,
      userInChargeId: maria.id,
      assignedUserId: andrei.id,
    }),
    // Order 2: SENT_TO_SUPPLIER (for Siemens, linked to offer)
    soRepo.create({
      status: SupplierOrderStatus.SENT_TO_SUPPLIER,
      supplierOrderRegistrationNumber: 'SORN-2026-002',
      orderAcknowledgmentNumber: 'OAN-MOL-002',
      orderAcknowledgmentDate: new Date('2026-02-15'),
      endUser: 'Siemens Romania SRL',
      partialShipment: true,
      incoterm2010: 'FCA',
      meanOfShipment: 'Sea freight + truck',
      requestedDeliveryDate: '2026-03-25',
      remarks: 'Partial delivery accepted',
      termsAndMeanOfPayment: 'Net 30 - bank transfer',
      pointOfSales: 'Bucuresti',
      otherInstructions: 'Certificate of conformity required',
      customerOfferId: offerSiemens.id,
      supplierId: molex.id,
      userInChargeId: admin.id,
      assignedUserId: maria.id,
    }),
    // Order 3: DELIVERED (for Siemens, linked to offer)
    soRepo.create({
      status: SupplierOrderStatus.DELIVERED,
      supplierOrderRegistrationNumber: 'SORN-2026-003',
      orderAcknowledgmentNumber: 'OAN-MUR-003',
      orderAcknowledgmentDate: new Date('2026-01-20'),
      customerCommittedDeliveryDate: new Date('2026-02-28'),
      estimatedDeliveryDate: new Date('2026-02-25'),
      endUser: 'Siemens Romania SRL',
      partialShipment: false,
      incoterm2010: 'DAP',
      meanOfShipment: 'Truck',
      requestedDeliveryDate: '2026-02-28',
      remarks: 'Completed delivery',
      termsAndMeanOfPayment: 'Net 45 - bank transfer',
      pointOfSales: 'Bucuresti',
      otherInstructions: 'None',
      customerOfferId: offerSiemens.id,
      supplierId: murata.id,
      userInChargeId: admin.id,
      assignedUserId: andrei.id,
    }),
  ]);
  const [soCreated, soSent, soDelivered] = supplierOrders;

  const sorRepo = ds.getRepository(SupplierOrderRow);
  const orderRows = await sorRepo.save([
    // Order 1 rows (Murata, simple)
    sorRepo.create({
      supplierOrderId: soCreated.id,
      suppliersProductCatalogId: murCap.id,
      unitPrice: 0.038,
      orderedQuantity: 5000,
    }),
    sorRepo.create({
      supplierOrderId: soCreated.id,
      suppliersProductCatalogId: murRes.id,
      unitPrice: 0.018,
      orderedQuantity: 10000,
    }),
    // Order 2 rows (Molex, for Siemens offer)
    sorRepo.create({
      supplierOrderId: soSent.id,
      suppliersProductCatalogId: molUsbc.id,
      unitPrice: 1.72,
      orderedQuantity: 200,
    }),
    sorRepo.create({
      supplierOrderId: soSent.id,
      suppliersProductCatalogId: molFfc.id,
      unitPrice: 0.88,
      orderedQuantity: 300,
    }),
    // Order 3 rows (Murata, delivered for Siemens offer)
    sorRepo.create({
      supplierOrderId: soDelivered.id,
      suppliersProductCatalogId: murCap.id,
      unitPrice: 0.042,
      orderedQuantity: 2000,
    }),
    sorRepo.create({
      supplierOrderId: soDelivered.id,
      suppliersProductCatalogId: murFfc.id,
      unitPrice: 0.80,
      orderedQuantity: 300,
    }),
  ]);
  const [sor1Cap, sor1Res, sor2Usbc, sor2Ffc, sor3Cap, sor3Ffc] = orderRows;

  // ──────────────────────────────────────────────
  // Phase 6: Deliveries & Stock entries
  // ──────────────────────────────────────────────
  console.log('Phase 6: Deliveries, Stock entries...');

  const sedRepo = ds.getRepository(StockEntryDelivery);
  const deliveries = await sedRepo.save([
    // Delivered order (order 3) — full deliveries
    sedRepo.create({
      supplierOrderRowId: sor3Cap.id,
      quantity: 2000,
      estimatedShipmentDate: new Date('2026-02-20'),
      shipmentDate: new Date('2026-02-22'),
      awb: 'AWB-MUR-2026-001',
      dviNumber: 'DVI-2026-0015',
      dviDate: new Date('2026-02-25'),
      nirNumber: 'NIR-2026-0015',
      nirDate: new Date('2026-02-25'),
      supplierInvoiceNumber: 'INV-MUR-2026-0089',
      supplierInvoiceDate: new Date('2026-02-22'),
      supplierCurrencyToRonExchangeRate: 4.9745,
    }),
    sedRepo.create({
      supplierOrderRowId: sor3Ffc.id,
      quantity: 300,
      estimatedShipmentDate: new Date('2026-02-20'),
      shipmentDate: new Date('2026-02-22'),
      awb: 'AWB-MUR-2026-002',
      dviNumber: 'DVI-2026-0016',
      dviDate: new Date('2026-02-25'),
      nirNumber: 'NIR-2026-0016',
      nirDate: new Date('2026-02-25'),
      supplierInvoiceNumber: 'INV-MUR-2026-0090',
      supplierInvoiceDate: new Date('2026-02-22'),
      supplierCurrencyToRonExchangeRate: 4.9745,
    }),
    // Sent order (order 2) — partial delivery pending
    sedRepo.create({
      supplierOrderRowId: sor2Usbc.id,
      quantity: 100,
      estimatedShipmentDate: new Date('2026-03-15'),
    }),
    sedRepo.create({
      supplierOrderRowId: sor2Ffc.id,
      quantity: 150,
      estimatedShipmentDate: new Date('2026-03-15'),
    }),
  ]);
  const [delCap, delFfc, delUsbc, delFfcPending] = deliveries;

  const seRepo = ds.getRepository(StockEntry);
  const stockEntries = await seRepo.save([
    // From delivered order (reserved — customerOfferId from supplier order)
    seRepo.create({
      serialNumber: 'SN-CAP-MUR-001',
      stockEntryDeliveryId: delCap.id,
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: offerSiemens.id,
    }),
    seRepo.create({
      serialNumber: 'SN-CAP-MUR-002',
      stockEntryDeliveryId: delCap.id,
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: offerSiemens.id,
    }),
    seRepo.create({
      serialNumber: 'SN-CAP-MUR-003',
      stockEntryDeliveryId: delCap.id,
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: offerSiemens.id,
    }),
    seRepo.create({
      serialNumber: 'SN-FFC-MUR-001',
      stockEntryDeliveryId: delFfc.id,
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: offerSiemens.id,
    }),
    seRepo.create({
      serialNumber: 'SN-FFC-MUR-002',
      stockEntryDeliveryId: delFfc.id,
      origin: StockEntryOrigin.FROM_RESERVED_SUPPLIER_ORDER,
      customerOfferId: offerSiemens.id,
    }),
    // Some free stock (simple supplier order, no customer offer)
    seRepo.create({
      serialNumber: 'SN-CAP-FREE-001',
      stockEntryDeliveryId: delCap.id,
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
    }),
    seRepo.create({
      serialNumber: 'SN-FFC-FREE-001',
      stockEntryDeliveryId: delFfc.id,
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
    }),
    seRepo.create({
      serialNumber: 'SN-FFC-FREE-002',
      stockEntryDeliveryId: delFfc.id,
      origin: StockEntryOrigin.FROM_SIMPLE_SUPPLIER_ORDER,
    }),
  ]);

  // Update product stock counts
  await productRepo.update(condensator.id, {
    stock: 3,
    reservedStock: 3,
  });
  await productRepo.update(cableFfc.id, {
    stock: 5,
    reservedStock: 2,
  });

  // ──────────────────────────────────────────────
  // Phase 7: Stock exits (sales)
  // ──────────────────────────────────────────────
  console.log('Phase 7: Stock exits...');

  const sxRepo = ds.getRepository(StockExit);
  await sxRepo.save([
    // Direct sale of free stock
    sxRepo.create({
      stockEntrySerialNumber: 'SN-FFC-FREE-001',
      source: StockExitSource.DIRECT_SALE,
      customerId: dacia.id,
      invoiceDate: new Date('2026-02-28'),
      invoiceNumber: 'INV-RTK-2026-0001',
      exitPriceRon: 5.25,
      exitPriceEur: 1.06,
      sourceCountry: 'Romania',
      destinationCountry: 'Romania',
      productLocalization: 'Depozit Bucuresti',
      observations: 'Vanzare directa catre Dacia',
      declarationOfConformityNumber: 'DC-2026-0001',
      declarationOfConformityDate: new Date('2026-02-28'),
      handoverReceptionReportNumber: 'HR-2026-0001',
      handoverReceptionReportDate: new Date('2026-02-28'),
      warrantyQualityCertificateNumber: 'WC-2026-0001',
      warrantyQualityCertificateDate: new Date('2026-02-28'),
      warrantyStatus: 'Active - 24 luni',
      warrantyExpirationDate: new Date('2028-02-28'),
      physicallyDelivered: true,
    }),
    // Sale from reserved stock (Siemens offer)
    sxRepo.create({
      stockEntrySerialNumber: 'SN-CAP-MUR-001',
      source: StockExitSource.FROM_RESERVED_SUPPLIER_ORDER,
      customerId: siemens.id,
      customerOfferId: offerSiemens.id,
      invoiceDate: new Date('2026-03-01'),
      invoiceNumber: 'INV-RTK-2026-0002',
      exitPriceRon: 0.28,
      exitPriceEur: 0.056,
      sourceCountry: 'Romania',
      destinationCountry: 'Romania',
      productLocalization: 'Depozit Bucuresti',
      observations: 'Livrare din comanda Siemens PO-SIE-2026-0042',
      declarationOfConformityNumber: 'DC-2026-0002',
      declarationOfConformityDate: new Date('2026-03-01'),
      handoverReceptionReportNumber: 'HR-2026-0002',
      handoverReceptionReportDate: new Date('2026-03-01'),
      warrantyQualityCertificateNumber: 'WC-2026-0002',
      warrantyQualityCertificateDate: new Date('2026-03-01'),
      warrantyStatus: 'Active - 12 luni',
      warrantyExpirationDate: new Date('2027-03-01'),
      physicallyDelivered: true,
    }),
  ]);

  console.log('Seed completed successfully!');
  console.log('');
  console.log('Login credentials (all users):');
  console.log('  Password: Password1!');
  console.log('  Admin:    admin@romtek.ro');
  console.log('  User 1:   maria@romtek.ro');
  console.log('  User 2:   andrei@romtek.ro');

  await app.close();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
