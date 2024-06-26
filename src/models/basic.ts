interface NamedElement {
  id: string
  label_en: string
  label_de?: string
}

export type Format = NamedElement;
export type Language = NamedElement;
export type Level = NamedElement;
export type MiniPOI = NamedElement;

export type TextFormat = "plain" | "markdown";

export interface Subconference {
  type: "subconference"
  id: string
  label: string
  event: string
}

export interface Day {
  type: "day"
  id: string
  date: string
  event: string
}

export enum ItemType {
  speaker = "speaker",
  session = "session"
} 
