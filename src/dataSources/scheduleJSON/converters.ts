import * as ConferenceModel from "../../models";
import { English, languageFromIsoCode } from "../rp/language";
import { mkId } from "../util";
import { ScheduleJSONDataSourceFormat } from "./dataFormat";

export interface ScheduleJSONPerson {
  id: number
  guid: string
  name: string
  public_name: string
}

export interface ScheduleJSONSession {
  guid: string
  id: number
  date: string //  "2023-12-27T10:30:00+01:00",
  start: string //  "10:30",
  duration: string //  "00:30",
  room: string | null //  "Saal 1",
  slug: string //  "37c3-12338-37c3_feierliche_eroffnung",
  url: string //  "https://events.ccc.de/congress/2023/hub/en/event/37c3_feierliche_eroffnung/",
  title: string //  "37C3: Feierliche Er\u00f6ffnung",
  subtitle: string | null //  null,
  language: string //  "en",
  track: string | null //  null,
  type: string //  "lecture",
  abstract: string | null //  null,
  description: string //  "",
  persons?: ScheduleJSONPerson[]
}

export interface ScheduleJSONDay {
  index: number
  date: string
  day_start: string
  day_end: string
  rooms: Record<string, ScheduleJSONSession[]>
}

export interface ScheduleJSONData {
  schedule: {
    version: string,
    base_url: string,
    conference: {
      acronym: string
      title: string
      start: string
      end: string
      daysCount: number
      timeslot_duration: string
      time_zone_name: string
      days: ScheduleJSONDay[]
    }
  }
}

export function sessionsFromJson(data: ScheduleJSONData, config: ScheduleJSONDataSourceFormat): ConferenceModel.Session[] {
  const result: ConferenceModel.Session[] = [];

  for (const day of data.schedule.conference.days) {
    for (const roomName in day.rooms) {
      if (Object.prototype.hasOwnProperty.call(day.rooms, roomName)) {
        const sessions = day.rooms[roomName];
        for (const session of sessions) {
          const parsedSession = sessionFromJson(session, config);
          if (parsedSession) {
            result.push(parsedSession);
          }
        }
      }
    }
  }

  return result;
}

function sessionFromJson(json: ScheduleJSONSession, config: ScheduleJSONDataSourceFormat): ConferenceModel.Session | null {
  let track = config.defaultTrack
  if (json.track) {
    track = {
      type: "track",
      event: config.eventId,
      id: mkId(json.track),
      label_en: json.track,
      label_de: json.track,
      // FIXME: Determine color here
      color: config.defaultTrack.color,
    }
  }

  const result: ConferenceModel.Session = {
    id: json.guid,
    type: "session",
    event: config.eventId,
    abstract: json.abstract ?? "",
    description: json.description ?? "",
    url: json.url,
    track,
    lang: languageFromIsoCode(json.language) ?? English,
    speakers: json.persons?.map(p => miniSpeakerFromPerson(p)).filter(p => p != null) as ConferenceModel.MiniSpeaker[] ?? [],
    enclosures: [],
    links: [],
    title: json.title,
    subtitle: json.subtitle ?? undefined,
  }
 
  return result;
}

function miniSpeakerFromPerson(json: ScheduleJSONPerson): ConferenceModel.MiniSpeaker | null {
  return {
    id: json.guid,
    name: json.public_name
  };
}
