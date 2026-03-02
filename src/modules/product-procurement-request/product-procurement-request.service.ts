import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductProcurementRequestDto } from './dto/create-product-procurement-request.dto';
import { UpdateProductProcurementRequestDto } from './dto/update-product-procurement-request.dto';
import { ProductProcurementRequestRepository } from './repositories/product-procurement-request.repository';
import { ProductProcurementRequestStatus } from './entities/product-procurement-request.entity';
import { FindDto } from '../../utils/dtos/find.dto';

@Injectable()
export class ProductProcurementRequestService {
  constructor(
    private readonly pprRepository: ProductProcurementRequestRepository,
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
}
