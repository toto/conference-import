import axios from "axios";
import { MiniLocation, POI } from "../models";
import { POICategory } from "../models/poi";

export interface C3NavPOI {
  gid: number
  layer: string
  position: number[]
  text: string
  name?: string
  text_en: string | null
  type: string
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
  return source.map(s => poiFromC3NavPOI(s, options)).filter(poi => poi !== null) as POI[]
}

function poiFromC3NavPOI(poi: C3NavPOI, options: PoiOptions): POI | null {
  if (!["poi", "villages_point"].includes(poi.layer)) return null;

  const primaryText = poi.text ?? poi.name ?? poi.text_en;
  if (!primaryText) return null;

  const locationId = (options.poiToLocationId ?? {})[poi.gid];
  const location = (options.locations ?? []).find(l => l.id === locationId)

  const [long, lat] = poi.position;
  const result: POI = {
    id: `${poi.gid}`,
    event: options.eventId,
    type: "poi",
    positions: [],
    geo_position: {lat, long},
    category: c3NavPoiTypeToCategroy(poi.type),
    location: location ? {id: location.id, label_en: location.label_en, label_de: location.label_de} : undefined,
    label_en: (poi.text_en ?? primaryText).replace(/\n/g, " "),
    label_de: primaryText.replace(/\n/g, " "),
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

function  c3NavPoiTypeToCategroy(poiType: string | undefined): POICategory {
  if (!poiType) return "other"

  let result: POICategory = "other"
  switch (poiType) {
    case "orga":
      result = "organisation"
      break;
    case "showers":
      result = "service"
      break;
    case "villages_point":
      result = "community"
      break;
    
    default:
      break;
  }

  return result;
}