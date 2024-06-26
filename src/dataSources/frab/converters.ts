import * as moment from 'moment-timezone';
import { FrabDataSourceFormat } from "./dataFormat";
import { Session, MiniSpeaker, MiniTrack, Speaker, MiniSession, MiniLocation } from "../../models";
import { mkId, dehtml } from "../rp/utils";
import { languageFromIsoCode, English } from "../rp/language";
import { normalizedForId } from '../util';

function speakerFromJson(json: Record<string, string>, config: FrabDataSourceFormat): Speaker | undefined {
  if (!config.frabBaseUrl) return undefined;
  let biography = '';
  if (json.abstract) biography += json.abstract;
  if (json.abstract && json.description) biography += "\n\n";
  if (json.description) biography += json.description;

  const sessions: MiniSession[] = (json.events as unknown as Record<string, string>[]).map((miniSession: Record<string, string>) => {
    let id = config.subconferenceId && config.useSubconferenceIdInSessionId === true ? `${config.subconferenceId}-${miniSession.id}` : `${miniSession.id}`;
    if (config.preferGuid === true && miniSession.guid) {
      id = miniSession.guid;
    }
    return {
      id,
      title: miniSession.title,
    };
  });

  let speakerId = config.subconferenceId ? `${config.subconferenceId}-${json.id}` : `${json.id}`;
  if (config.baseSpeakerIdOnName === true) {
    speakerId = normalizedForId(json.public_name);
  }
  if (speakerId.length === 0) {
    return undefined;
  }

  // TODO: Speaker links
  const result: Speaker = {
    type: 'speaker',
    event: config.eventId,
    id: speakerId,
    name: json.public_name,
    biography,
    photo: json.image ? `${config.frabBaseUrl}${json.image}`.replace('/original/', '/large/') : undefined,
    url: `${config.frabBaseUrl}/speakers/${json.id}.html`,
    links: [],
    sessions,
    organization: undefined,
    position: undefined,
  };
  return result;
}

export function speakersFromJson(json: Record<string, unknown>, config: FrabDataSourceFormat): Speaker[] {
  const { schedule_speakers } = json;
  if (!schedule_speakers) return [];
  const { speakers } = schedule_speakers as {speakers: Record<string, string>[]};
  if (!speakers || !Array.isArray(speakers)) return [];

  const speakerResult = speakers.map(s => speakerFromJson(s, config));
  return speakerResult.filter(s => s !== undefined) as Speaker[];
}

export function sessionsFromJson(json: Record<string, unknown>, config: FrabDataSourceFormat): Session[] {
  const { schedule } = json;
  if (!schedule) return [];
  const { conference } = schedule as {conference: Record<string, unknown>};
  if (!conference) return [];
  const { days } = conference as {days: Record<string, unknown>[]};
  if (!days || !Array.isArray(days)) return [];

  const { ignoredLocationNames } = config;

  const result: Session[] = [];
  for (const day of days) {
    const { rooms, date } = day as {rooms: Record<string, string>[], date: string};
    if (!rooms) continue;

    for (const roomName in rooms) {
      if (ignoredLocationNames && ignoredLocationNames.includes(roomName)) {
        continue;
      }
      
      const sessionsForRoom = rooms[roomName];
      if (!Array.isArray(sessionsForRoom)) continue;

      for (const sessionJson of sessionsForRoom) {
        const session = parseSession(date, roomName, sessionJson, config);
        if (session) result.push(session);
      }
    }
  }
  return result;
}

export function pretalxSpeakersFromSessionJson(json: Record<string, unknown>, config: FrabDataSourceFormat): Speaker[] {
  const { schedule } = json;
  if (!schedule) return [];
  const { conference } = schedule as {conference: Record<string, unknown>};
  if (!conference) return [];
  const { days } = conference as {days: Record<string, unknown>[]};
  if (!days || !Array.isArray(days)) return [];

  const { ignoredLocationNames } = config;

  const result: Speaker[] = [];
  const speakerIds = new Set<string>();
  for (const day of days) {
    const { rooms } = day as {rooms: Record<string, string>[], date: string};
    if (!rooms) continue;

    for (const roomName in rooms) {
      if (ignoredLocationNames && ignoredLocationNames.includes(roomName)) {
        continue;
      }
      
      const sessionsForRoom = rooms[roomName];
      if (!Array.isArray(sessionsForRoom)) continue;

      for (const sessionJson of sessionsForRoom as Array<{"persons": Record<string, string>[]}>) {
        for (const person of sessionJson.persons) {
          if (speakerIds.has(person.id)) continue;
          if (person.public_name.length === 0) continue;
          speakerIds.add(person.id);
          result.push(
            {
              id: person.id,
              type: 'speaker',
              event: config.eventId,
              photo: undefined,
              url: config.pretalxBaseUrl ? `${config.pretalxBaseUrl}speaker/${person.code}` : null,
              organization: undefined,
              position: undefined,
              biography: person.biography,
              links: [],
              sessions: [],
              name: person.public_name,
            }
          )
        }
      }
    }
  }

  return result;
}

function parseSession(date: string, roomName: string, session: Record<string, unknown>, config: FrabDataSourceFormat): Session | undefined {
  let track: MiniTrack = config.defaultTrack;
  if (session.track) {
    track = {
      id: mkId(`${config.eventId}-${session.track}`),
      label_en: session.track as string,
      label_de: session.track as string,
    };
  }

  let locationId = mkId(roomName);
  if (config.useSubconferenceIdInLocations === true && config.subconferenceId) {
    locationId = `${config.subconferenceId}-${mkId(roomName)}`;
  }

  const location: MiniLocation = {
    id: locationId,
    label_de: roomName,
    label_en: roomName
  };

  let language = languageFromIsoCode(config.defaultLanguageCode);
  if (session.language) {
    const sessionLang = languageFromIsoCode(session.language as string);
    if (sessionLang) language = sessionLang;
  }

  let persons = session.persons as {id: number, public_name: string}[];
  if (!persons) persons = [];
  let speakers: MiniSpeaker[] = persons.map(person => {
    let id = `${person.id}`;
    if (config.baseSpeakerIdOnName === true) {
      id = normalizedForId(person.public_name);
    }
    return {
      id,
      name: person.public_name,
    }
  });

  speakers = speakers.filter(s => s.id.length > 0);

  let begin: moment.Moment | undefined;
  let end: moment.Moment | undefined;
  
  if (session.date && session.duration) {
    begin = moment(session.date as string);
    const [ hoursStr, minutesStr ] = (session.duration as string).split(':');
    end = moment(session.date as string);
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    end.add(hours, 'h');
    end.add(minutes, 'm');
  }

  let willBeRecorded: boolean | undefined;
  if (Object.keys(session).includes('do_not_record') && session['do_not_record']) {
    willBeRecorded = !session['do_not_record'];
  }
  
  let sessionId = `${session.id}`;
  if (config.preferGuid === true && session.guid) {
    sessionId = session.guid as string;
  } else if (session.guid && !session.id) {
    sessionId = session.guid as string;
  }

  if (sessionId.length === 0) {
    console.warn(`Session data without id or GUID, ignoring`);
    return undefined;
  }
  
  if (config.useSubconferenceIdInSessionId === true && config.subconferenceId) {
    sessionId = `${config.subconferenceId}-${sessionId}`;
  }

  const { url } = session as { url: string };
  // We need a url
  if (!url || !url.match(/https?:\/\//)) {
    console.error(`Invalid url for: ${session.id} (${session.title}) becuase of invalid URL '${url}'. Not importing session`);
    return undefined;
  }

  let id: string
  if (typeof session.guid === "string") {
    id = session.guid as string
  } else {
    id = config.prefixSessionsWithEventId === true ? `${config.eventId}-${sessionId}` : sessionId
  }
  
  const result: Session = {
    type: "session",
    event: config.eventId,
    id,
    title: session.title as string,
    subtitle: session.subtitle as string | undefined,
    abstract: session.abstract as string,
    description: dehtml(session.description as string),
    url,
    track,
    location,
    lang: language ?? English,
    enclosures: [],
    speakers,
    related_sessions: [],
    links: [],
    cancelled: false,
    will_be_recorded: willBeRecorded,
    begin,
    end,
  };

  return result;
}

export function miniSpeakerToSpeaker(miniSpeaker: MiniSpeaker, config: FrabDataSourceFormat): Speaker {
  const result: Speaker = {
    type: 'speaker',
    event: config.eventId,
    id: miniSpeaker.id,
    name: miniSpeaker.name,
    biography: "",
    photo: undefined,
    url: null,
    links: [],
    sessions: [],
    organization: undefined,
    position: undefined,
  };
  return result;
}

type Person = {id: number, code: string, biography: string, public_name: string}
type RoomEvent = {persons?: Person[]}
type DayWithRooms =  {rooms: Record<string, RoomEvent[]>}
type ScheduleWithDays = {schedule: {conference: {days: DayWithRooms[]}}}

export function pretalxCodeToFrabIdMap(frabSchedule: ScheduleWithDays): Record<string, string> {
  const result: Record<string, string> = {}
  const { days } = frabSchedule.schedule.conference;
  for (const day of days) {
    const { rooms } = day;
    for (const roomName of Object.keys(rooms)) {
      const events = rooms[roomName]
      for (const event of events) {
        if (!event.persons) continue;
        for (const person of event.persons) {
          result[person.code] = `${person.id}`;
        }
      }
    }
  }
  return result;
}