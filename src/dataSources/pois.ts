import axios from "axios";
import { MiniLocation, POI } from "../models";

export interface C3NavPOI {
  gid: number
  layer: string
  position: number[]
  text: string
  text_en: string
}

interface PoiOptions {
  eventId: string
  poiToLocationId?: Record<string, string>
  locations?: MiniLocation[]
}

export async function fetchedPoisFromC3Nav(url: string, options: PoiOptions): Promise<POI[]> {
  const response = await axios.get(url)
  const source = response.data as C3NavPOI[];
  return poisFromFromC3Nav(source, options);
}

export function poisFromFromC3Nav(source: C3NavPOI[], options: PoiOptions): POI[] {
  return source.map(s => poiFromC3NavPOI(s, options))
}

function poiFromC3NavPOI(poi: C3NavPOI, options: PoiOptions): POI {
  const [long, lat] = poi.position;
  const result: POI = {
    id: `${poi.gid}`,
    event: options.eventId,
    type: "poi",
    positions: [],
    geo_position: {lat, long},
    category: "other", // TODO
    location: undefined,
    label_en: (poi.text_en ?? poi.text)?.replace(/\n/g, " "),
    label_de: poi.text.replace(/\n/g, " "),
    links: [],
  }
  if (options.poiToLocationId && options.locations) {
    const locationId = options.poiToLocationId[result.id]
    if (locationId) {
      const miniLocation = options.locations.find(l => l.id === locationId);
      result.location = miniLocation;
      result.category = "session-location";
    }
  }
  return result;
}