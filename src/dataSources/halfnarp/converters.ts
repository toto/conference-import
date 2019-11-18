import { Session, MiniTrack, Track, Language, MiniSpeaker } from "../../models";
import { HalfnarpSourceFormat } from "./index";
import { languageFromIsoCode } from '../rp/language';
import { dehtml } from '../rp/utils';

function trackFromSessionJson(session: any, config: HalfnarpSourceFormat): Track | undefined {
  if (!session.track_id) return undefined;

  const idStr = `${session.track_id}`
  const trackId = config.trackIdMap[idStr];
  if (!trackId) return undefined;
  
  return config.tracks.find(t => t.id === trackId)
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

  // TODO: Add speakers once we get the id
  const speakers: MiniSpeaker[] = []

  const sessionUrl = `${config.sessionBaseUrl}${session.event_id}.html`
  
  const result: Session = {
    type: "session",
    event: config.eventId,
    id: `${session.event_id}`,
    title: session.title,
    subtitle: session.subtitle,
    abstract: session.abstract,
    description: dehtml(session.description),
    url: sessionUrl,
    track,
    location: undefined,
    lang: language,
    enclosures: [],
    speakers,
    related_sessions: [],
    links: [],
    cancelled: false,
    will_be_recorded: undefined,
    begin: undefined,
    end: undefined,
  };

  return result;
}
