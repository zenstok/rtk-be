import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { startTestDb, stopTestDb, TestDbConfig } from '../utils/test-db.setup';
import { createTestApp } from '../utils/test-app.setup';
import { cleanDatabase } from '../utils/db-cleanup';
import { TestFactories, resetFactoryCounter } from '../utils/factories';
import { SupplierOrderService } from '../../src/modules/supplier-order/supplier-order.service';
import { SupplierOrderStatus } from '../../src/modules/supplier-order/entities/supplier-order.entity';

describe('SupplierOrderService CRUD (integration)', () => {
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

  async function createOrderWithSeed() {
    const seed = await factories.seedSupplierOrderBase();
    const so = await factories.createSupplierOrder(
      seed.supplier.id,
      seed.user.id,
      seed.user.id,
      { customerOfferId: seed.customerOffer.id },
    );
    return { ...seed, so };
  }

  describe('findAll', () => {
    it('should return list rows with supplier and responsible users', async () => {
      const { so, supplier, user } = await createOrderWithSeed();

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.results[0].id).toBe(so.id);
      expect(result.results[0].supplier?.id).toBe(supplier.id);
      expect(result.results[0].userInCharge?.id).toBe(user.id);
      expect(result.results[0].assignedUser?.id).toBe(user.id);
    });
  });

  describe('findOne', () => {
    it('should return supplier order with relations', async () => {
      const { so } = await createOrderWithSeed();

      const result = await service.findOne(so.id);

      expect(result.id).toBe(so.id);
      expect(result.supplier).toBeDefined();
      expect(result.userInCharge).toBeDefined();
      expect(result.assignedUser).toBeDefined();
      expect(result.customerOffer).toBeDefined();
    });

    it('should throw NotFoundException for non-existent order', async () => {
      await expect(service.findOne(99999)).rejects.toThrow(
        'Supplier order not found',
      );
    });
  });

  describe('update', () => {
    it('should update metadata fields', async () => {
      const { so } = await createOrderWithSeed();

      const result = await service.update(so.id, {
        endUser: 'Updated End User',
        remarks: 'Updated remarks',
        estimatedDeliveryDate: '2026-06-01',
      });

      expect(result.message).toBe('Supplier order updated successfully');

      const updated = await service.findOne(so.id);
      expect(updated.endUser).toBe('Updated End User');
      expect(updated.remarks).toBe('Updated remarks');
    });

    it('should throw NotFoundException for non-existent order', async () => {
      await expect(service.update(99999, { remarks: 'test' })).rejects.toThrow(
        'Supplier order not found',
      );
    });

    it('should reject update on canceled order', async () => {
      const { so } = await createOrderWithSeed();
      await service.cancel(so.id);

      await expect(
        service.update(so.id, { remarks: 'should fail' }),
      ).rejects.toThrow('Cannot update a canceled order');
    });
  });

  describe('cancel', () => {
    it('should set status to CANCELED', async () => {
      const { so } = await createOrderWithSeed();

      const result = await service.cancel(so.id);
      expect(result.message).toBe('Supplier order canceled successfully');

      const canceled = await service.findOne(so.id);
      expect(canceled.status).toBe(SupplierOrderStatus.CANCELED);
    });

    it('should throw if already canceled', async () => {
      const { so } = await createOrderWithSeed();
      await service.cancel(so.id);

      await expect(service.cancel(so.id)).rejects.toThrow(
        'Supplier order is already canceled',
      );
    });

    it('should throw NotFoundException for non-existent order', async () => {
      await expect(service.cancel(99999)).rejects.toThrow(
        'Supplier order not found',
      );
    });
  });
});
