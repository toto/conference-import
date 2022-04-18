import { Rp2APIElement } from ".";
import { Subconference, Track } from "../../models";
import { colorArrayFromHex, mkId } from "../util";



/*
{
    "tid": "14",
    "name": "media",
    "type": "Tags",
    "language": "en",
    "color": "#ff3469"
  }
*/
export function trackFromApiTerm(apiTerm: Rp2APIElement, options: {eventId: string, defaultColor: number[]}): Track | null {
  const { name, type, color } = apiTerm;
  if (typeof name !== "string") return null;
  if (type !== "Tags") return null;

  let trackColor = options.defaultColor as [number, number, number, number];
  if (typeof color === "string" && color.length === 7 && color.charAt(0) === "#") {
    const colorValue = colorArrayFromHex(color);
    if (colorValue) trackColor = colorValue
  }
  const label = name;
  label[0].toUpperCase();
  return {
    id: mkId(name),
    type: "track",
    event: options.eventId,
    label_en: label,
    label_de: label,
    color: trackColor,
  }
}

export function subconferenceFromApiTerm(apiTerm: Rp2APIElement, options: {eventId: string}): Subconference | null {
  const { name, type } = apiTerm;
  if (typeof name !== "string") return null;
  if (type !== "Special Curation") return null;
  return {
    type: "subconference",
    id: mkId(name),
    event: options.eventId,
    label: name,
  }
}