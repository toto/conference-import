import { Language } from './../../models';

const english: Language = {
  id: 'en',
  label_en: 'English',
  label_de: 'Englisch',
}

const german: Language = {
  id: 'de',
  label_en: 'German',
  label_de: 'Deutsch',
}

export function languageFromString(str: string): Language | null {
  if (str === 'English') return english;
  if (str === 'German') return german;
  return null;
}