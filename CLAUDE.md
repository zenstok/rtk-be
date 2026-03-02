# RTK Management System - Backend

Supply chain / inventory management system for RomTek Electronics SRL. Handles the full lifecycle from procurement requests through price analysis, customer offers, supplier orders, stock entries, and stock exits.

## Tech Stack

- **Runtime:** NestJS (Node.js), TypeScript (strict mode, ES2023, nodenext modules)
- **Database:** PostgreSQL (port 5433 via docker-compose), TypeORM with `synchronize: true`
- **Validation:** class-validator + class-transformer, global ValidationPipe (`transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`)
- **Docs:** Swagger at `/api`
- **Testing:** Jest + Testcontainers (PostgreSQL), integration tests in `test/`
- **PDF:** pdfkit for supplier order PDF generation

## Project Structure

```
src/modules/
├── app.module.ts              # Root module, wires everything
├── bnr-api/                   # BNR (Romanian National Bank) exchange rate API
├── customer/                  # Customer + CustomerContactPerson entities
├── customer-offer/            # Customer offers lifecycle (core module)
├── file/                      # File upload/storage + cleanup cron
├── price-analysis/            # PriceAnalysis → SupplierGroup → Row
├── product/                   # Products catalog
├── product-procurement-request/ # PPR (initiates the whole flow)
├── stock-entry/               # StockEntry + StockEntryDelivery
├── stock-exit/                # StockExit (sale records)
├── supplier/                  # Supplier + SupplierContactPerson
├── supplier-order/            # Supplier orders + rows + delivery management
├── suppliers-product-catalog/ # Links suppliers ↔ products (with supplier codes)
└── user/                      # Users (admin roles)
```

## Architecture Patterns

### Module Pattern
Each module: `module.ts` → `controller.ts` → `service.ts` + `entities/` + `dto/` + `repositories/`

### Custom Repositories
Extend `Repository<Entity>` from TypeORM, injected via constructor with `DataSource`. Registered as providers (not `@InjectRepository`):
```typescript
@Injectable()
export class FooRepository extends Repository<Foo> {
  constructor(dataSource: DataSource) {
    super(Foo, dataSource.createEntityManager());
  }
}
```

### DTOs
- Use `class-validator` decorators + `@ApiProperty()` from Swagger
- `@Type(() => Number)` from class-transformer for numeric params
- Conditional/cross-field validation done in **service layer** (throw `BadRequestException`), not in DTOs
- `FindDto` (in `src/utils/dtos/find.dto.ts`) provides `limit`/`offset` pagination

### Transactions
Use `DataSource.transaction(async (manager) => { ... })` for multi-step operations. All operations within use the scoped `manager`, not injected repositories.

### Computed Columns
Use TypeORM query builder with correlated SQL subqueries + `getRawMany()` for list endpoints with aggregated data. See `CustomerOfferService.findAllProducts` and `SupplierOrderService.findProducts`.

## Entity Data Model

```
ProductProcurementRequest
    └── PriceAnalysis (exchange rates, discounts)
        └── PriceAnalysisSupplierGroup (per supplier, costs)
            └── PriceAnalysisRow (per product-supplier, qty/price/discounts)
                └── SuppliersProductCatalog ──→ Product + Supplier

CustomerOffer (from PriceAnalysis)
    ├── SupplierOrder[] (via customerOfferId, nullable)
    │   └── SupplierOrderRow[] (per product, qty + price)
    │       └── StockEntryDelivery[] (shipment tracking)
    │           └── StockEntry[] (individual items by serial number)
    └── StockExit[] (sale records per serial number)
```

### Key Enums

**CustomerOfferStatus:** `IN_PROGRESS → FINALIZED → SENT_TO_CUSTOMER → RECEIVED_CUSTOMER_ORDER → CONFIRMED_CUSTOMER_ORDER` (+ `CANCELED` from any state)

**SupplierOrderStatus:** `CREATED → VALIDATED → SENT_TO_SUPPLIER → IN_DELIVERY → DELIVERED` (+ `CANCELED`)

**StockEntryOrigin:**
- `FROM_RESERVED_SUPPLIER_ORDER` — customerOfferId always set at creation (from supplierOrder.customerOfferId). Cannot be unreserved.
- `FROM_SIMPLE_SUPPLIER_ORDER` — customerOfferId initially NULL (free stock). Can be manually reserved/unreserved.

**StockExitSource:** `DIRECT_SALE`, `FROM_OFFER_RESERVATION`, `FROM_RESERVED_SUPPLIER_ORDER`

### Key Business Rules

- **Stock entries** get their origin based on whether the parent supplier order has `customerOfferId` set
- **Stock exits from Product Screen:** only for simple supplier order entries that are NOT reserved to any offer
- **Stock exits from Offer Screen:** for entries reserved to that customer offer
- **Close date/probability:** auto-set to current date and 100% when status → `RECEIVED_CUSTOMER_ORDER`, locked after that
- **Supplier ↔ SupplierContactPerson:** circular FK, handled with `DISABLE TRIGGER ALL` in factories
- **Delivery quantity validation:** sum of all delivery quantities for a supplier order row must not exceed orderedQuantity

## Testing

### Infrastructure (`test/utils/`)
- `test-db.setup.ts` — Testcontainers with PostgreSQL 17.5
- `test-app.setup.ts` — NestJS test module with all entities + service providers (dropSchema + synchronize)
- `db-cleanup.ts` — TRUNCATE CASCADE all tables between tests
- `factories.ts` — `TestFactories` class with factory methods for all entities + high-level seed helpers (`seedFindAllProductsBase`, `seedSupplierOrderBase`)

### Running Tests
```bash
npm run test:e2e                    # all integration tests
npx jest --config test/jest-e2e.json --testPathPatterns 'test/supplier-order/' --runInBand  # specific suite
```

### Test Pattern
```typescript
beforeAll: startTestDb → createTestApp → get services/factories
afterAll: app.close → stopTestDb
afterEach: cleanDatabase → resetFactoryCounter
```

When adding a new service to test, register it + its repositories in `test-app.setup.ts` providers.

## Development

```bash
docker-compose up -d    # PostgreSQL on port 5433
npm run start:dev       # NestJS dev server with watch
npm run build           # Production build
```

Swagger docs available at `http://localhost:3000/api` when running.
