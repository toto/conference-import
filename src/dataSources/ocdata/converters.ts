import * as moment from 'moment-timezone';
import { Map, Speaker, Subconference, Day, Track, Location, Session } from "../../models";
import { OcDataSourceFormat } from '.';

export function speakersFromJson(json: any, options: OcDataSourceFormat): Speaker[] {
  const speakers = untransformedFromJson(json, 'speaker') as Speaker[];

  return speakers.map((speaker) => {
    const { id } = speaker;
    const speakerMap = options.testData?.speakerToActivityPubLink
    if (!speakerMap) return speaker;
    const speakerLink = speakerMap[id]
    if (speakerLink) {
      speaker.links.push({
        url: speakerLink,
        type: "social-interaction",
        service: "activityPub",
        title: speaker.name,
      })
    }
    return speaker;
  })
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

export function sessionsFromJson(json: any, options: OcDataSourceFormat): Session[] {
  if (!Array.isArray(json)) return [];

  const sessions = json.filter(s => s.type === 'session').map((s) => {
    if (s.begin) s.begin = moment(s.begin);
    if (s.end) s.end = moment(s.end);
    return s;
  }) as Session[];

  return sessions.map((session) => {
    const { id } = session;
    const sessionMap = options.testData?.sessionToActivityPubLink
    if (!sessionMap) return session;
    const sessionLink = sessionMap[id]
    if (sessionLink) {
      session.links.push({
        url: sessionLink,
        type: "social-interaction",
        service: "activityPub",
        title: session.title,
      })
    }
    return session;
  })
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