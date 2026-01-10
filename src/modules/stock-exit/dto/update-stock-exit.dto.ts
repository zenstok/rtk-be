import { PartialType } from '@nestjs/mapped-types';
import { CreateStockExitDto } from './create-stock-exit.dto';

export class UpdateStockExitDto extends PartialType(CreateStockExitDto) {}
