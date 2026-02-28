import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DateUtilityService {
  constructor() {}

  private parseDateString(dateString: string): Date {
    const normalized = dateString.trim();
    const ddMmYyyy = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (ddMmYyyy) {
      const [, day, month, year] = ddMmYyyy;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  getDateFromTimeStamp(stamp: any): Date {
    const secs = stamp.seconds;
    var t = new Date(0);
    t.setUTCSeconds(secs);
    return t;
  }

  getDateFromString(dateString: string): Date {
    return this.parseDateString(dateString);
  }

  getDateWithDateTimeshift(date: Date): Date {
    return this.getDateWithDateStringTimeshift(
      date.toLocaleDateString()
    );
  }

  getDateWithDateStringTimeshift(dateString: string): Date {
    let finalDate = this.parseDateString(dateString);
    const time = new Date();
    finalDate.setHours(time.getHours());
    finalDate.setMinutes(time.getMinutes());
    finalDate.setSeconds(time.getSeconds());
    return finalDate;
  }
}
