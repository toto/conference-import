import * as moment from 'moment-timezone';
import * as ConferenceModel from "../../models";
import { English, languageFromIsoCode } from "../rp/language";
import { colorArrayFromHex, mkId } from "../util";
import type { ScheduleJSONDataSourceFormat } from "./dataFormat";

export interface ScheduleJSONPerson {
  id: number
  guid?: string
  code?: string
  name: string
  url?: string | null
  public_name?: string
  avatar_url?: string
  avatar?: string | null
  biography?: string | null
  links?: { url: string, title: string }[]
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
  persons?: ScheduleJSONPerson[],
  feedback_url?: string
  links?: { url: string, title: string }[]
  do_not_record?: boolean
  do_not_stream?: boolean
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
      tracks?: ScheduleJSONTrack[]
      rooms?: ScheduleJSONRoom[]
    }
  }
}

interface ScheduleJSONTrack {
  name: string,
  color: string,
  slug: string,
}

interface ScheduleJSONRoom {
  name: string // "Saal 1",
  slug: string // "saal-1",
  guid: string // "ba692ba3-421b-5371-8309-60acc34a3c05",
  type: string // "lecturehall",
  stream_id: string | null // "s1",
  capacity: number // 3025,
  description_en: string | null // "",
  description_de: string | null  // "",
  assembly: { 
    name: string // ": "CCC",
    slug: string // ": "ccc",
    guid: string // ": "b46b321a-19b9-4cd6-8aab-52a127268d6f",
    description_en: string // ": "",
    description_de: string // ": ""
  }
  features: {
    // This is a bit crazy. Please check here: https://github.com/voc/schedule/pull/130
    recording: "record_by_default" | "not_recorded_by_default" | "recording_forbidden" | "recording_not_possible"
  }
}

export function locationsFromJSON(data: ScheduleJSONData, config: ScheduleJSONDataSourceFormat): {locations: ConferenceModel.Location[], locationIdToStreamId: Record<string, string>} {
  const locations: ConferenceModel.Location[] = [];
  const locationIdToStreamId: Record<string, string> = {};

  const { conference } = data.schedule;
  if (!conference.rooms) return {locations: [], locationIdToStreamId: {}};

  conference.rooms.forEach((roomData, index) => {
    locations.push({
      id: roomData.guid,
      type: 'location',
      event: config.eventId,
      label_en: roomData.name,
      label_de: roomData.name,
      is_stage: roomData.type === "lecturehall",
      order_index: index
    });

    if (roomData.stream_id) {
      locationIdToStreamId[roomData.guid] = roomData.stream_id;
    }
  })

  return { locations, locationIdToStreamId };
}

export function tracksFromJson(data: ScheduleJSONData, config: ScheduleJSONDataSourceFormat): ConferenceModel.Track[] {
  const result: ConferenceModel.Track[] = [];

  const { conference } = data.schedule;
  if (!conference.tracks) return [];

  for (const trackData of conference.tracks) {
    const color = colorArrayFromHex(trackData.color) ?? config.defaultTrack.color;
    result.push({
      id: mkId(trackData.name),
      type: 'track',
      event: config.eventId,
      color,
      darkColor: color,
      label_en: trackData.name,
      label_de: trackData.name,
    });
  }

  return result;
}

export function sessionsFromJson(data: ScheduleJSONData, locations: ConferenceModel.Location[], config: ScheduleJSONDataSourceFormat): ConferenceModel.Session[] {
  const result: ConferenceModel.Session[] = [];

  const { conference } = data.schedule;

  const { subconferences, locationIdToSubconferenceId  } = subsconferencesAndLocationIdMapFromSessionJson(data, config);

  for (const day of conference.days) {
    for (const roomName in day.rooms) {
      if (Object.prototype.hasOwnProperty.call(day.rooms, roomName)) {
        const sessions = day.rooms[roomName];
        for (const session of sessions) {
          const location = locations.find(l => l.label_en === roomName) ?? null;
          let subconference: ConferenceModel.Subconference | null = null
          if (location) {
            const subconferenceId = locationIdToSubconferenceId.get(location.id)
            if (subconferenceId) {
              subconference = subconferences.find(s => s.id === subconferenceId) ?? null
            }
          }

          const parsedSession = sessionFromJson(session, location, location !== null ? roomName : null, conference.rooms ?? null, subconference, config);
          if (parsedSession) {
            result.push(parsedSession);
          }
        }
      }
    }
  }

  return result;
}

// NOTE: roomName is only set if fullLocation is null
export function sessionFromJson(json: ScheduleJSONSession, fullLocation: ConferenceModel.Location | null, roomName: string | null, rooms: ScheduleJSONRoom[] | null, subconference: ConferenceModel.Subconference | null, config: ScheduleJSONDataSourceFormat): ConferenceModel.Session | null {
  const id = json.guid;
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

  let begin: moment.Moment | undefined;
  let end: moment.Moment | undefined;

  if (json.date && json.duration) {
    begin = moment(json.date);
    const [hoursStr, minutesStr] = (json.duration).split(':');
    end = moment(json.date);
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    end.add(hours, 'h');
    end.add(minutes, 'm');
  }

  let location: ConferenceModel.MiniLocation | undefined 
  if (fullLocation) {
    location = {
      id: fullLocation.id,
      label_en: fullLocation.label_en,
      label_de: fullLocation.label_de,
    }
  } else if (roomName) {
    console.warn(`WARNING: Unknown room with name: '${roomName}'`)
    location = {
      id: mkId(roomName),
      label_en: roomName,
      label_de: roomName,
    }
  }

  const links: ConferenceModel.Link[] = [];

  if (json.links) {
    for (const link of json.links) {
      links.push({
        url: link.url,
        type: "session-link",
        title: link.title,
        service: 'web'
      })
    }
  }

  if (json.feedback_url) {
    links.push({
      url: json.feedback_url,
      type: 'feedback-link',
      title: `Session feedback`,
      service: 'web'
    })
  }

  if (config.c3nav && location) {
    const { baseUrl, locationIdToNavSlug } = config.c3nav;
    const slug = locationIdToNavSlug[location.id];
    if (slug && location?.label_en) {
      links.unshift({
        url: `${baseUrl}${slug}/`,
        type: "session-link",
        title: `C3Nav: ${location.label_en}`,
        service: "web",
      })
    }
  }


  let will_be_recorded: boolean | undefined

  if (config.voc?.recordedLocationIds && location?.id) {
    if (config.voc?.recordedLocationIds.includes(location?.id)) {
      will_be_recorded = true
    }
  }

  const room = rooms?.find(r => r.name === roomName)
  if (room && room.features?.recording) {
    const recording = room.features.recording
    if (recording === "recording_forbidden" 
      || recording === "recording_not_possible"
      || recording === "not_recorded_by_default") {
      will_be_recorded = false
    } else if (recording === "record_by_default") {
      will_be_recorded = true
    }
  }

  if (json.do_not_record === true) {
    will_be_recorded = false
  }

  let subtitle: undefined | string
  if (json.subtitle && json.subtitle.trim().length > 0) {
    subtitle = json.subtitle
  }

  const enclosures: ConferenceModel.Enclosure[] = [];
  if (config.fakeVideos && config.fakeVideos[id]) {
    enclosures.push(config.fakeVideos[id]);
  }

  const result: ConferenceModel.Session = {
    id,
    type: "session",
    event: config.eventId,
    title: json.title,
    subtitle: subtitle,
    abstract: json.abstract ?? "",
    description: json.description ?? "",
    description_format: "markdown",
    url: json.url,
    track,
    begin,
    end,
    location,
    lang: languageFromIsoCode(json.language) ?? English,
    speakers: json.persons?.map(p => miniSpeakerFromPerson(p)).filter(p => p != null) as ConferenceModel.MiniSpeaker[] ?? [],
    enclosures,
    links,
    subconference: subconference ? subconference : undefined,
    will_be_recorded,
  }

  return result;
}

function miniSpeakerFromPerson(json: ScheduleJSONPerson): ConferenceModel.MiniSpeaker | null {
  const id = json.guid ?? json.code;
  if (!id) return null;

  return {
    id,
    name: json.name ?? json.public_name,
  };
}

export function speakersFromSessionJson(json: ScheduleJSONData, config: ScheduleJSONDataSourceFormat): ConferenceModel.Speaker[] {
  const result: Map<string, ConferenceModel.Speaker> = new Map();

  const { conference } = json.schedule;

  for (const day of conference.days) {
    for (const roomName in day.rooms) {
      if (Object.prototype.hasOwnProperty.call(day.rooms, roomName)) {
        const sessions = day.rooms[roomName];
        for (const session of sessions) {
          const miniSession: ConferenceModel.MiniSession = {
            id: session.guid,
            title: session.title
          }

          for (const person of session.persons ?? []) {
            const id = person.guid ?? person.code
            if (!id) continue;
            const speaker = result.get(id)

            // for existing speakers just update the session list
            if (speaker) {
              speaker.sessions.push(miniSession);

            } else {

              const links: ConferenceModel.Link[] = (person.links ?? []).map(l => {
                return {
                  url: l.url,
                  type: 'speaker-link',
                  title: l.title,
                  service: 'web'
                }
              });

              const url: string | null = person.url ?? null;

              // TODO: Possibly add URL
              const speaker: ConferenceModel.Speaker = {
                id,
                name: person.name,
                type: 'speaker',
                event: config.eventId,
                photo: person.avatar_url ?? person.avatar ?? undefined,
                url,
                biography: person.biography ?? undefined,
                biography_format: "markdown",
                links,
                sessions: [miniSession],
                organization: undefined,
                position: undefined
              }
              result.set(id, speaker)
            }
          }
        }
      }
    }
  }

  return Array.from(result.values());
}

export function subsconferencesAndLocationIdMapFromSessionJson(data: ScheduleJSONData, config: ScheduleJSONDataSourceFormat): {subconferences: ConferenceModel.Subconference[], locationIdToSubconferenceId: Map<string, string>} {
  const locationIdToSubconferenceId: Map<string, string> = new Map()

  if (!data.schedule.conference.rooms) return { subconferences: [], locationIdToSubconferenceId };

  const result: Map<string, ConferenceModel.Subconference> = new Map();

  for (const room of data.schedule.conference.rooms) {
    const { assembly } = room;
    if (!assembly || !assembly.slug || assembly.slug === config.mainConferenceAssemblySlug) {
      continue;
    }

    locationIdToSubconferenceId.set(room.guid, assembly.slug);

    result.set(assembly.slug, {
      type: 'subconference',
      id: assembly.slug,
      label: assembly.name,
      event: config.eventId,
    })
  }

  return {
    subconferences: Array.from(result.values()),
    locationIdToSubconferenceId,
  };
}

export function subsconferencesFromSessionJson(data: ScheduleJSONData, config: ScheduleJSONDataSourceFormat): ConferenceModel.Subconference[] {
  const { subconferences } = subsconferencesAndLocationIdMapFromSessionJson(data, config)
  return subconferences;
}



/** Speaker json */

interface SpeakersJSONData {
  schedule_speakers: {
    version: string,
    speakers: SpeakerJSONData[]
  }
}

interface SpeakerJSONData {
  guid: string // "9ef179da-dc86-5b02-a231-353fe964e2e9",
  id: number // 19378,
  image: string | null, // null,
  name: string // "@cyanpencil (Luca Di Bartolomeo)",
  public_name?: string // "@cyanpencil (Luca Di Bartolomeo)",
  abstract: string | null, // null,
  description: string | null, // null,
  links: { title: string, url: string }[],
  events: {
    guid: string // "f68ec6e2-72ce-4f8a-bc14-af174fdae140",
    id: number // 12254,
    title: string // "ARMore: Pushing Love Back Into Binaries",
    logo: string // "/system/events/logos/000/012/254/large/heart.png?1699741296",
    type: string // "lecture"
  }[]

}

export function speakersFromJson(data: SpeakersJSONData, config: ScheduleJSONDataSourceFormat): ConferenceModel.Speaker[] {
  return data.schedule_speakers.speakers.map(s => speakerFromJson(s, config)).filter(s => s !== null) as ConferenceModel.Speaker[];
}

function speakerFromJson(data: SpeakerJSONData, config: ScheduleJSONDataSourceFormat): ConferenceModel.Speaker | null {
  if (!config.speakers) return null;

  let biography = '';

  if (data.abstract) {
    biography += data.abstract;
    if (data.description) {
      biography += "\n\n"
    }
  }

  if (data.description) {
    biography += data.description;
  }

  const links: ConferenceModel.Link[] = [];

  if (data.links) {
    for (const linkData of data.links) {
      links.push({
        title: linkData.title,
        url: linkData.url,
        type: 'speaker-link',
        service: 'web',
      });
    }
  }

  const sessions: ConferenceModel.MiniSession[] = [];

  if (data.events) {
    for (const eventData of data.events) {
      sessions.push({
        id: eventData.guid,
        title: eventData.title,
      })
    }
  }

  const urlPrefix = config.speakers.jsonURL.replace("/speakers.json", "/speakers/");

  const result: ConferenceModel.Speaker = {
    id: data.guid,
    name: data.public_name ?? data.name,
    type: 'speaker',
    event: config.eventId,
    photo: data.image ? `${config.speakers?.imageBaseURL}${data.image}` : undefined,
    url: `${urlPrefix}${data.id}.html`,
    biography,
    biography_format: "markdown",
    links,
    sessions,
  }

  return result;
}
