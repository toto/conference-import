import * as moment from 'moment-timezone';

interface NamedElement {
  id: string
  label_en: string
  label_de?: string
}

export type Format = NamedElement;
export type Language = NamedElement;
export type Level = NamedElement;

export interface Subconference {
  id: string
  lable: string
}

export interface Day {
  id: string
  date: moment.Moment
}