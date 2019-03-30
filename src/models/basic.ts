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
  label: string
}

export interface Day {
  id: string
  date: moment.Moment
}

export enum ItemType {
  speaker = "speaker",
  session = "session"
} 