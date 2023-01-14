import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StringUtilityService {
  constructor() {}

  deaccent(str: string): string {
    return str
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\u0142/g, 'l');
  }
}
