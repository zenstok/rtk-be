import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BnrApiHistory } from './entities/bnr-api-history.entity';

@Injectable()
export class BnrApiService {
  private readonly apiUrl = 'https://www.bnr.ro/nbrfxrates.xml';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(BnrApiHistory)
    private readonly bnrApiHistoryRepository: Repository<BnrApiHistory>,
  ) {}

  async getExchangeRatesForToday() {
    const now = new Date();
    const [lastEntry, lastButOneEntry] =
      await this.bnrApiHistoryRepository.find({
        order: {
          id: 'DESC',
        },
        take: 2,
      });

    if (!lastEntry || !lastButOneEntry) {
      throw new InternalServerErrorException(
        'Database not seeded with last 2 history entries for BNR API!',
      );
    }

    const bnrDateFormat = this.extractBnrFormatInRoTimezoneFromDate(now);
    const givenDate = new Date(bnrDateFormat);
    const lastEntryPublishingDate = new Date(lastEntry.publishingDate);

    if (givenDate <= lastEntryPublishingDate) {
      return {
        eurToRonExchangeRate: lastButOneEntry.eurToRonExchangeRate,
        usdToRonExchangeRate: lastButOneEntry.usdToRonExchangeRate,
        gbpToRonExchangeRate: lastButOneEntry.gbpToRonExchangeRate,
      };
    }

    return {
      eurToRonExchangeRate: lastEntry.eurToRonExchangeRate,
      usdToRonExchangeRate: lastEntry.usdToRonExchangeRate,
      gbpToRonExchangeRate: lastEntry.gbpToRonExchangeRate,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  private async saveApiExchangeRate() {
    const result = await this.getApiExchangeRate();
    if (!result) {
      return;
    }

    await this.bnrApiHistoryRepository.upsert(
      this.bnrApiHistoryRepository.create({
        publishingDate: result.publishingDate,
        eurToRonExchangeRate: result.eurToRonExchangeRate,
        usdToRonExchangeRate: result.usdToRonExchangeRate,
        gbpToRonExchangeRate: result.gbpToRonExchangeRate,
      }),
      {
        conflictPaths: { publishingDate: true },
        skipUpdateIfNoValuesChanged: true,
      },
    );
  }

  private async getApiExchangeRate() {
    const response = await firstValueFrom(this.httpService.get(this.apiUrl));
    const status = response.status;

    if (status !== 200) {
      return;
    }

    const data = response.data;

    const publishingDate = data.match(
      /<PublishingDate>(.+)<\/PublishingDate>/,
    )[1];
    const eurToRonExchangeRate = +data.match(
      /<Rate\s+currency="EUR"\s*>([^<]+)<\/Rate>/,
    )[1];
    const usdToRonExchangeRate = +data.match(
      /<Rate\s+currency="USD"\s*>([^<]+)<\/Rate>/,
    )[1];
    const gbpToRonExchangeRate = +data.match(
      /<Rate\s+currency="GBP"\s*>([^<]+)<\/Rate>/,
    )[1];

    if (
      !publishingDate ||
      isNaN(eurToRonExchangeRate) ||
      isNaN(usdToRonExchangeRate) ||
      isNaN(gbpToRonExchangeRate)
    ) {
      return;
    }

    return {
      publishingDate: publishingDate as string,
      eurToRonExchangeRate,
      usdToRonExchangeRate,
      gbpToRonExchangeRate,
    };
  }

  private extractBnrFormatInRoTimezoneFromDate(date: Date): string {
    const roTimezoneDateString = date.toLocaleString('ro-RO', {
      timeZone: 'Europe/Bucharest',
    });
    const [day, month, year] = roTimezoneDateString.split(',')[0]!.split('.');

    return `${year}-${month}-${day}`;
  }
}
