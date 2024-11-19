import { Session, MiniTrack, Track, Language, MiniSpeaker, Speaker } from "../../models";
import { HalfnarpSourceFormat } from "./index";
import { languageFromIsoCode } from '../rp/language';
import { dehtml, mkId } from '../rp/utils';

function trackFromSessionJson(session: any, config: HalfnarpSourceFormat): Track | undefined {
  if (!session.track_id) return undefined;

  const idStr = `${session.track_id}`
  if (!config.trackIdMap) return undefined;
  const trackId = config.trackIdMap[idStr];
  if (!trackId) return undefined;
  
  const track = config.tracks.find(t => t.id === trackId)
  if (!track) return undefined;
  if (!track.darkColor) {
    track.darkColor = track.color
  }
  return track;
}

export function speakersFromJson(json: any, config: HalfnarpSourceFormat): Speaker[] {
  if (!Array.isArray(json)) return [];

  let speakers: Speaker[] = []; 

  json.forEach(sessionJson => {
    const speakersForSession = speakersFromSession(sessionJson, config);
    speakers = speakers.concat(speakersForSession);
  });
  
  return speakers
}

function speakersFromSession(session: any, config: HalfnarpSourceFormat): Speaker[] {
  const speakers: Speaker[] = [];

  const speakerNames: string[] = session.speaker_names.split(', ');
  for (const name of speakerNames) {
    if (name.trim() === '') continue;

    const id = mkId(`${config.eventId}-${name.trim()}`);
    const speaker: Speaker = {
      type: 'speaker',
      event: config.eventId,
      id,
      name,
      biography: '',
      photo: undefined,
      url: config.speakerBaseUrl,
      links: [],
      sessions: [],
      organization: undefined,
      position: undefined,
    };
    speakers.push(speaker);
  }

  return speakers;
}

export function sessionsFromJson(json: any, config: HalfnarpSourceFormat): Session[] {
  if (!Array.isArray(json)) return [];

  const sessions = json.map(j => parseSession(j, config))
  return sessions.filter(s => s !== undefined) as Session[]
}

function parseSession(session: any, config: HalfnarpSourceFormat): Session | undefined {
  let track: MiniTrack = config.defaultTrack;
  const realTrack = trackFromSessionJson(session, config);
  if (realTrack) {
    track = {
      id: realTrack.id,
      label_en: realTrack.label_en,
      label_de: realTrack.label_de,
    };
  }

  
  let language: Language = languageFromIsoCode(config.defaultLanguageCode)!;
  if (session.language) {
    const sessionLang = languageFromIsoCode(session.language);
    if (sessionLang) language = sessionLang;
  }

  const speakers: Speaker[] = speakersFromSession(session, config);
  const miniSpeakers: MiniSpeaker[] = speakers.map(s => { return {id: s.id , name: s.name} } );

  const sessionUrl = `${config.sessionBaseUrl}${session.event_id}.html`
  let id: string 
  if (session.guid) {
    id = session.guid;
  } else {
    id = mkId(`${config.eventId}-${session.event_id}`);
  }

  const result: Session = {
    type: "session",
    event: config.eventId,
    id,
    title: session.title,
    subtitle: session.subtitle,
    abstract: dehtml(session.abstract),
    description: dehtml(session.description),
    url: sessionUrl,
    track,
    location: undefined,
    lang: language,
    enclosures: [],
    speakers: miniSpeakers,
    related_sessions: [],
    links: [],
    cancelled: false,
    will_be_recorded: undefined,
    begin: undefined,
    end: undefined,
  };

  return result;
}
