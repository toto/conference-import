import { Language } from './../../models';

export const English: Language = {
  id: 'en',
  label_en: 'English',
  label_de: 'Englisch',
}

export const German: Language = {
  id: 'de',
  label_en: 'German',
  label_de: 'Deutsch',
}

export function languageFromString(str: string): Language | null {
  if (str === 'English') return English;
  if (str === 'German') return German;
  return null;
}

export function languageFromIsoCode(str: string): Language | null {
  if (str === 'en') return English;
  if (str === 'de') return German;
  return null;
}