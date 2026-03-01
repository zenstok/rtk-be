import { Injectable } from '@nestjs/common';
import { CreateStockExitDto } from './dto/create-stock-exit.dto';
import { UpdateStockExitDto } from './dto/update-stock-exit.dto';
import { FindDto } from '../../utils/dtos/find.dto';
import { StockExitRepository } from './repositories/stock-exit.repository';

@Injectable()
export class StockExitService {
  constructor(private readonly stockExitRepository: StockExitRepository) {}

  create(createStockExitDto: CreateStockExitDto) {
    return 'This action adds a new stockExit';
  }

  findAll() {
    return `This action returns all stockExit`;
  }

  async findAllByCustomerOfferId(customerOfferId: number, dto: FindDto) {
    const [results, total] = await this.stockExitRepository.findAndCount({
      where: { stockEntry: { customerOfferId } },
      order: { createdAt: 'DESC' },
      skip: dto.offset,
      take: dto.limit > 0 ? dto.limit : undefined,
    });

    return { results, total };
  }

  findOne(id: number) {
    return `This action returns a #${id} stockExit`;
  }

  update(id: number, updateStockExitDto: UpdateStockExitDto) {
    return `This action updates a #${id} stockExit`;
  }

  remove(id: number) {
    return `This action removes a #${id} stockExit`;
  }
}
