import * as moment from 'moment-timezone';
import { Location, Session, Track } from "../../models";
import { C3HubDataSourceFormat } from "./dataFormat";
import { English } from '../rp/language';

export interface C3HubScheduleEntry {
  id: string
  slug: string
  name: string
  url: string
  kind: string
  assembly: string
  schedule_start?: string
  schedule_end?: string
  room: string | null
  track: string | null
  description: string
}

export function sessionsFromJson(json: C3HubScheduleEntry[], config: C3HubDataSourceFormat): Session[] {
  return json.map(s => sessionFromJson(s, config)).filter(s => s !== null) as Session[];
}


export function sessionFromJson(json: C3HubScheduleEntry, config: C3HubDataSourceFormat): Session | null {
  if (!config.includedKinds.includes(json.kind)) return null;
  if (!json.schedule_start || !json.schedule_end) return null;

  const url = `${config.webSessionBaseUrl}${json.slug}`

  const result: Session = {
    type: "session",
    event: config.eventId,
    id: json.id,
    title: json.name,
    subtitle: undefined,
    abstract: "",
    description: json.description,
    url,
    track: config.defaultTrack,
    location: undefined,
    lang: English,
    enclosures: [],
    speakers: [],
    related_sessions: [],
    links: [],
    cancelled: false,
    will_be_recorded: false,
    begin: moment(json.schedule_start),
    end: moment(json.schedule_end),
  };

  return result;
}


/**
 * Example: 
  {
    "conference": "19cb1ca2-706d-4c4f-bb21-04ae0c2bd6fa",
    "slug": "art-beauty",
    "name": "Art & Beauty",
    "id": 3
  },
 */
export interface C3HubTrackEntry {
  conference: string
  slug: string
  name: string
  id: number
}

export function tracksFromJson(json: C3HubTrackEntry[], config: C3HubDataSourceFormat): Track[] {
  return json.map(trackData => {
    return {
      type: "track",
      id: trackData.slug,
      label_en: trackData.name,
      label_de: trackData.name,
      event: config.eventId,
      color: config.defaultTrack.color,
    }
  });
}

export interface C3HubRoomEntry {
  id: string
  name: string
  room_type: string
  capacity?: number
  links: string[]
  conference: string
  assembly: string
}

export function locationsFromJson(json: C3HubRoomEntry[], config: C3HubDataSourceFormat): Location[] {
  return [];
}