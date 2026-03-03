import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateProductProcurementRequestDto } from './dto/create-product-procurement-request.dto';
import { UpdateProductProcurementRequestDto } from './dto/update-product-procurement-request.dto';
import {
  ProductProcurementRequest,
  ProductProcurementRequestStatus,
} from './entities/product-procurement-request.entity';
import { CustomerOfferStatus } from '../customer-offer/entities/customer-offer.entity';
import { FindDto } from '../../utils/dtos/find.dto';

/**
 * Priority of CustomerOffer statuses, used to determine the "highest" status
 * when multiple offers exist for a PPR.
 */
const OFFER_STATUS_PRIORITY: Record<CustomerOfferStatus, number> = {
  [CustomerOfferStatus.CANCELED]: 0,
  [CustomerOfferStatus.IN_PROGRESS]: 1,
  [CustomerOfferStatus.FINALIZED]: 2,
  [CustomerOfferStatus.SENT_TO_CUSTOMER]: 3,
  [CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER]: 4,
  [CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER]: 5,
};

/** Maps the highest non-canceled CustomerOffer status to the corresponding PPR status. */
const OFFER_TO_PPR_STATUS: Record<
  CustomerOfferStatus,
  ProductProcurementRequestStatus
> = {
  [CustomerOfferStatus.IN_PROGRESS]:
    ProductProcurementRequestStatus.OFFER_CREATED,
  [CustomerOfferStatus.FINALIZED]:
    ProductProcurementRequestStatus.OFFER_CREATED,
  [CustomerOfferStatus.SENT_TO_CUSTOMER]:
    ProductProcurementRequestStatus.OFFER_SENT_TO_CUSTOMER,
  [CustomerOfferStatus.RECEIVED_CUSTOMER_ORDER]:
    ProductProcurementRequestStatus.OFFER_ACCEPTED,
  [CustomerOfferStatus.CONFIRMED_CUSTOMER_ORDER]:
    ProductProcurementRequestStatus.OFFER_ACCEPTED,
  [CustomerOfferStatus.CANCELED]:
    ProductProcurementRequestStatus.OFFER_CANCELED,
};

@Injectable()
export class ProductProcurementRequestService {
  constructor(
    @InjectRepository(ProductProcurementRequest)
    private readonly pprRepository: Repository<ProductProcurementRequest>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateProductProcurementRequestDto) {
    return this.pprRepository.save({
      ...dto,
      status: ProductProcurementRequestStatus.IN_PROGRESS,
    });
  }

  async findAll(dto: FindDto) {
    const [results, total] = await this.pprRepository.findAndCount({
      relations: { assignedUser: true, customer: true },
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    await this.computeStatuses(results);

    return { results, total };
  }

  async findOne(id: number) {
    const ppr = await this.pprRepository.findOne({
      where: { id },
      relations: {
        assignedUser: true,
        customer: true,
        customerContactPerson: true,
        ccCustomerContactPerson: true,
      },
    });
    if (!ppr) {
      throw new NotFoundException('Product procurement request not found');
    }

    await this.computeStatuses([ppr]);

    return ppr;
  }

  async update(id: number, dto: UpdateProductProcurementRequestDto) {
    const ppr = await this.pprRepository.findOneBy({ id });
    if (!ppr) {
      throw new NotFoundException('Product procurement request not found');
    }
    if (ppr.status === ProductProcurementRequestStatus.CANCELED) {
      throw new BadRequestException(
        'Cannot update a canceled product procurement request',
      );
    }
    await this.pprRepository.update({ id }, dto);
    return { message: 'Product procurement request updated successfully' };
  }

  async cancel(id: number) {
    const ppr = await this.pprRepository.findOneBy({ id });
    if (!ppr) {
      throw new NotFoundException('Product procurement request not found');
    }
    if (ppr.status !== ProductProcurementRequestStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Can only cancel product procurement requests with status IN_PROGRESS',
      );
    }
    await this.pprRepository.update(
      { id },
      { status: ProductProcurementRequestStatus.CANCELED },
    );
    return { message: 'Product procurement request canceled successfully' };
  }

  async remove(id: number) {
    if (!(await this.pprRepository.existsBy({ id }))) {
      throw new NotFoundException('Product procurement request not found');
    }
    await this.pprRepository.delete({ id });
    return { message: 'Product procurement request deleted successfully' };
  }

  // ---------------------------------------------------------------------------
  // Computed status helpers
  // ---------------------------------------------------------------------------

  /**
   * Fetches all CustomerOffer statuses grouped by PPR id, then overwrites
   * the `status` field on each PPR with the computed value.
   *
   * DB only stores IN_PROGRESS or CANCELED. The derived statuses
   * (OFFER_CREATED, OFFER_SENT_TO_CUSTOMER, OFFER_ACCEPTED, OFFER_CANCELED)
   * are computed from the highest-priority associated CustomerOffer status.
   */
  private async computeStatuses(
    pprs: ProductProcurementRequest[],
  ): Promise<void> {
    if (pprs.length === 0) return;

    const pprIds = pprs.map((p) => p.id);

    const rows: { pprId: number; status: CustomerOfferStatus }[] =
      await this.dataSource
        .createQueryBuilder()
        .select('pa.product_procurement_request_id', 'pprId')
        .addSelect('co.status', 'status')
        .from('customer_offers', 'co')
        .innerJoin('price_analyses', 'pa', 'pa.id = co.price_analysis_id')
        .where('pa.product_procurement_request_id IN (:...pprIds)', { pprIds })
        .getRawMany();

    const offersByPpr = new Map<number, CustomerOfferStatus[]>();
    for (const row of rows) {
      const arr = offersByPpr.get(row.pprId) ?? [];
      arr.push(row.status);
      offersByPpr.set(row.pprId, arr);
    }

    for (const ppr of pprs) {
      (ppr as { status: ProductProcurementRequestStatus }).status =
        this.deriveStatus(ppr.status, offersByPpr.get(ppr.id) ?? []);
    }
  }

  private deriveStatus(
    dbStatus: ProductProcurementRequestStatus,
    offerStatuses: CustomerOfferStatus[],
  ): ProductProcurementRequestStatus {
    if (dbStatus === ProductProcurementRequestStatus.CANCELED) {
      return ProductProcurementRequestStatus.CANCELED;
    }
    if (offerStatuses.length === 0) {
      return ProductProcurementRequestStatus.IN_PROGRESS;
    }

    const nonCanceled = offerStatuses.filter(
      (s) => s !== CustomerOfferStatus.CANCELED,
    );
    if (nonCanceled.length === 0) {
      return ProductProcurementRequestStatus.OFFER_CANCELED;
    }

    const highest = nonCanceled.reduce((best, s) =>
      OFFER_STATUS_PRIORITY[s] > OFFER_STATUS_PRIORITY[best] ? s : best,
    );

    return OFFER_TO_PPR_STATUS[highest];
  }
}
