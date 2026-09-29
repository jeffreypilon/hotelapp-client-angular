import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney } from '../util/format';

/** Template-facing wrapper over shared/util/format.ts -- the only place money is formatted. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: string, currency = 'USD'): string {
    return formatMoney(amount, currency);
  }
}
