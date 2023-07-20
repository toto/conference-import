import axios from "axios";
import { POI } from "../models";

export interface C3NavPOI {
  gid: number
  layer: string
  position: number[]
  text: string
  text_en: string
}

interface PoiOptions {
  eventId: string
}

export async function fetchedPoisFromC3Nav(url: string, options: PoiOptions): Promise<POI[]> {
  const response = await axios.get(url)
  const source = response.data as C3NavPOI[];
  return poisFromFromC3Nav(source, options);
}

export function poisFromFromC3Nav(source: C3NavPOI[], options: PoiOptions): POI[] {
  return source.map(s => poiFromC3NavPOI(options.eventId, s))
}

function poiFromC3NavPOI(eventId: string, poi: C3NavPOI): POI {
  const [lat, long] = poi.position;
  const result: POI = {
    id: `${poi.gid}`,
    event: eventId,
    type: "poi",
    positions: [],
    geo_position: {lat, long},
    category: "other", // TODO
    location: undefined,
    label_en: poi.text_en,
    label_de: poi.text,
    links: [],
  }
  return result;
}