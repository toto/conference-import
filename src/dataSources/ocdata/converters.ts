import * as moment from 'moment-timezone';
import { Map, Speaker, Subconference, Day, Track, Location, Session } from "../../models";

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

export function mapsFromJson(json: any): Map[] {
  return untransformedFromJson(json, 'map');
}

export function locationsFromJson(json: any): Location[] {
  return untransformedFromJson(json, 'location');
}

export function sessionsFromJson(json: any): Session[] {
  if (!Array.isArray(json)) return [];

  return json.filter(s => s.type === 'session').map((s) => {
    if (s.begin) s.begin = moment(s.begin);
    if (s.end) s.end = moment(s.end);
    return s;
  }) as Session[];
}

function untransformedFromJson<T>(json: any, type: string): T[] {
  if (!Array.isArray(json)) return [];

  return json.filter(s => s.type === type) as T[];
}

export function mergeWithoutDuplication<T extends {id: string}>(source: (T | undefined)[], existing: T[]): T[] {
  const exsistingIdSet = new Set<string>(existing.map(e => e.id));
  const result = existing;
  source.forEach(s => {
    if (!s || exsistingIdSet.has(s.id)) return;
    result.push(s);
    exsistingIdSet.add(s.id);
  });
  return result;
}