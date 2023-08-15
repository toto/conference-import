import * as moment from 'moment-timezone';
import { Session } from "../../models";
import { C3HubDataSourceFormat } from "./dataFormat";
import { English } from '../rp/language';

export interface C3HubScheduleEntry {
  id: string
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

  const result: Session = {
    type: "session",
    event: config.eventId,
    id: json.id,
    title: json.name,
    subtitle: undefined,
    abstract: "",
    description: json.description,
    url: json.url,
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