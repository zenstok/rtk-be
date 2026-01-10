import { Injectable } from '@nestjs/common';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';

@Injectable()
export class StockEntryService {
  create(createStockEntryDto: CreateStockEntryDto) {
    return 'This action adds a new stockEntry';
  }

  findAll() {
    return `This action returns all stockEntry`;
  }

  findOne(id: number) {
    return `This action returns a #${id} stockEntry`;
  }

  update(id: number, updateStockEntryDto: UpdateStockEntryDto) {
    return `This action updates a #${id} stockEntry`;
  }

  remove(id: number) {
    return `This action removes a #${id} stockEntry`;
  }
}
