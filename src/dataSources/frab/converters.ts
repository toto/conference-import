import * as moment from 'moment-timezone';
import { FrabDataSourceFormat } from "./dataFormat";
import { Session, Language, MiniSpeaker, MiniTrack, Speaker, MiniSession, MiniLocation } from "../../models";
import { mkId, dehtml } from "../rp/utils";
import { languageFromIsoCode } from "../rp/language";

function speakerFromJson(json: any, config: FrabDataSourceFormat): Speaker | undefined {
  if (!config.frabBaseUrl) return undefined;
  let biography = '';
  if (json.abstract) biography += json.abstract;
  if (json.abstract && json.description) biography += "\n\n";
  if (json.description) biography += json.description;

  const sessions: MiniSession[] = json.events.map((miniSession: any) => {
    return {
      id: config.subconferenceId ? `${config.subconferenceId}-${miniSession.id}` : `${miniSession.id}`,
      title: miniSession.title,
    };
  });
  // TODO: Speaker links
  const result: Speaker = {
    type: 'speaker',
    event: config.eventId,
    id: config.subconferenceId ? `${config.subconferenceId}-${json.id}` : `${json.id}`,
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

export function speakersFromJson(json: any, config: FrabDataSourceFormat): Speaker[] {
  const { schedule_speakers } = json;
  if (!schedule_speakers) return [];
  const { speakers } = schedule_speakers;
  if (!speakers || !Array.isArray(speakers)) return [];

  const speakerResult = speakers.map((s: any) => speakerFromJson(s, config));
  return speakerResult.filter(s => s !== undefined) as Speaker[];
}

export function sessionsFromJson(json: any, config: FrabDataSourceFormat): Session[] {
  const { schedule } = json;
  if (!schedule) return [];
  const { conference } = schedule;
  if (!conference) return [];
  const { days } = conference;
  if (!days) return [];

  const { ignoredLocationNames } = config;

  const result: Session[] = [];
  for (const day of days) {
    const { rooms } = day;
    if (!rooms) continue;

    for (const roomName in rooms) {
      if (ignoredLocationNames && ignoredLocationNames.includes(roomName)) {
        continue;
      }
      
      const sessionsForRoom = rooms[roomName];
      if (!Array.isArray(sessionsForRoom)) continue;

      for (const sessionJson of sessionsForRoom) {
        const session = parseSession(day.date, roomName, sessionJson, config);
        if (session) result.push(session);
      }
    }
  }
  return result;
}

function parseSession(date: string, roomName: string, session: any, config: FrabDataSourceFormat): Session | undefined {
  let track: MiniTrack = config.defaultTrack;
  if (session.track) {
    track = {
      id: mkId(`${config.eventId}-${session.track}`),
      label_en: session.track,
      label_de: session.track,
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

  let language: Language = languageFromIsoCode(config.defaultLanguageCode)!;
  if (session.language) {
    const sessionLang = languageFromIsoCode(session.language);
    if (sessionLang) language = sessionLang;
  }

  let persons = session.persons;
  if (!persons) persons = [];
  const speakers: MiniSpeaker[] = persons.map((person: {id: number, public_name: string}) => {
    return {
      id: `${person.id}`,
      name: person.public_name,
    }
  });

  let begin: moment.Moment | undefined;
  let end: moment.Moment | undefined;
  
  if (session.date && session.duration) {
    begin = moment(session.date);
    const [ hoursStr, minutesStr ] = session.duration.split(':');
    end = moment(session.date);
    end.add(parseInt(hoursStr), 'h');
    end.add(parseInt(minutesStr), 'm');
  }

  let willBeRecorded: boolean | undefined;
  if (Object.keys(session).includes('do_not_record') && session['do_not_record']) {
    willBeRecorded = !session['do_not_record'];
  }
  
  let sessionId = `${session.id}`;
  if (session.guid && !session.id) {
    sessionId = session.guid;
  }
  if (config.useSubconferenceIdInSessionId === true && config.subconferenceId) {
    sessionId = `${config.subconferenceId}-${sessionId}`;
  }
  
  const result: Session = {
    type: "session",
    event: config.eventId,
    id: config.prefixSessionsWithEventId === true ? `${config.eventId}-${sessionId}` : sessionId,
    title: session.title,
    subtitle: session.subtitle,
    abstract: session.abstract,
    description: dehtml(session.description),
    url: session.url,
    track,
    location,
    lang: language,
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
