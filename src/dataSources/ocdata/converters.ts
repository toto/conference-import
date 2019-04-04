import * as moment from 'moment-timezone';
import { Speaker, Subconference, Day, Track, Location, Session } from "../../models";

export function speakersFromJson(json: any): Speaker[] {
  return untransformedFromJson(json, 'speaker');
}

export function daysFromJson(json: any): Day[] {
  return untransformedFromJson(json, 'day');
}

export function subconferencesFromJson(json: any): Subconference[] {
  return untransformedFromJson(json, 'subconference');
}

export function tracksFromJson(json: any): Track[] {
  return untransformedFromJson(json, 'track');
}

export function locationsFromJson(json: any): Location[] {
  return untransformedFromJson(json, 'location');
}

export function sessionsFromJson(json: any): Session[] {
  if (!Array.isArray(json)) return [];

  return json.filter(s => s.type === 'session').map((s) => {
    if (s.begin) s.begin = moment(s.begin);
    if (s.end) s.begin = moment(s.end);
    return s;
  }) as Session[];
}

function untransformedFromJson<T>(json: any, type: string): T[] {
  if (!Array.isArray(json)) return [];

  return json.filter(s => s.type === type) as T[];
}