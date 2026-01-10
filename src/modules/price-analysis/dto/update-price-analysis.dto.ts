import { PartialType } from '@nestjs/mapped-types';
import { CreatePriceAnalysisDto } from './create-price-analysis.dto';

export class UpdatePriceAnalysisDto extends PartialType(CreatePriceAnalysisDto) {}
