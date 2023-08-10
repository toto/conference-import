import { MiniPOI } from './basic';
import { Link } from './link';
import { MiniLocation } from './location';

interface MapPosition {
  identifier: string,
  x: number,
  y: number
}

export type POICategory = "session-location" | "workshop-location" | "service" | 
  "info" | "safety"  | "community" | "food" | "entertainment" |
  "organisation" | "restroom" | "elevator"  | "escalator" | "shopping" |
  "other";

export interface POI extends MiniPOI {
  event: string,	
  type: "poi",
  positions: MapPosition[],
  geo_position: {lat: number, long: number},
  category: POICategory,
  location?: MiniLocation,
  label_en: string,
  label_de?: string,
  description_en?: string,
  description_de?: string,
  links: Link[],
  hidden?: boolean,
	priority?: number,
	beacons?: {uuid: string, major: number, minor: number}[],
}
