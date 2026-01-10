import { Injectable } from '@nestjs/common';
import { CreateStockExitDto } from './dto/create-stock-exit.dto';
import { UpdateStockExitDto } from './dto/update-stock-exit.dto';

@Injectable()
export class StockExitService {
  create(createStockExitDto: CreateStockExitDto) {
    return 'This action adds a new stockExit';
  }

  findAll() {
    return `This action returns all stockExit`;
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
