import { Rp2APIElement } from ".";
import { Subconference, Track } from "../../models";
import { colorArrayFromHex, mkId } from "../util";
import { normalizedTrackId } from "./util";



/*
{
    "tid": "14",
    "name": "media",
    "type": "Tags",
    "language": "en",
    "color": "#ff3469"
  }
*/
export function trackFromApiTerm(apiTerm: Rp2APIElement, options: {eventId: string, defaultColor: number[], colors: Record<string, number[]>, trackMappings: Record<string, Array<string>>}): Track | null {
  const { name, type, color, language } = apiTerm;
  if (typeof name !== "string") return null;
  if (type !== "Tracks") return null;
  if (language !== "en") return null;
  const id = normalizedTrackId(name.toLowerCase(), options.trackMappings)


  let trackColor;
  if (typeof color === "string" && color.length === 7 && color.charAt(0) === "#") {
    const colorValue = colorArrayFromHex(color);
    if (colorValue) trackColor = colorValue
  }
  if (!trackColor) {
    const mappedColor = options.colors[id];
    if (mappedColor) { 
      trackColor = mappedColor;
    } else {
      trackColor = options.defaultColor as [number, number, number, number];
    }
  }
  
  const label = name;
  label[0].toUpperCase();
  return {
    id: id,
    type: "track",
    event: options.eventId,
    label_en: label,
    label_de: label,
    color: trackColor,
  }
}

export function subconferenceFromApiTerm(apiTerm: Rp2APIElement, options: {eventId: string}): Subconference | null {
  const { name, type, language } = apiTerm;
  if (typeof name !== "string") return null;
  if (type !== "Special Curation") return null;
  if (language !== "en") return null;
  return {
    type: "subconference",
    id: mkId(name),
    event: options.eventId,
    label: name,
  }
}