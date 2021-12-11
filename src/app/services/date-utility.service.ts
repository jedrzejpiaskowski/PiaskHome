import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class DateUtilityService {
  constructor() {}

  getDateFromTimeStamp(stamp: any): Date {
    const secs = stamp.seconds;
    var t = new Date(0);
    t.setUTCSeconds(secs);
    return t;
  }

  getDateFromString(dateString: string): Date {
    return moment(dateString, 'DD.MM.YYYY').toDate();
  }

  getDateWithDateTimeshift(date: Date): Date {
    return this.getDateWithDateStringTimeshift(
      date.toLocaleDateString()
    );
  }

  getDateWithDateStringTimeshift(dateString: string): Date {
    let finalDate = moment(dateString, 'DD.MM.YYYY').toDate();
    const time = new Date();
    finalDate.setHours(time.getHours());
    finalDate.setMinutes(time.getMinutes());
    finalDate.setSeconds(time.getSeconds());
    return finalDate;
  }
}
