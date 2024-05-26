import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";

import { DataSourceFormat } from "../dataSource";
import { sessionFromApiSession } from "./session";
import { speakerFromApiSpeaker } from "./speaker";
import { subconferenceFromApiTerm, trackFromApiTerm } from "./term";
import { partnerLinks } from "./link";
import { youtubeUrlByTitle } from "./youtube";

export interface Rp2DataSourceFormat extends DataSourceFormat {
  format: "rp2"
  dataBaseUrl: string
  dataAuth?: { username: string, password: string }
  speakerUrlPrefix: string
  sessionUrlPrefix: string
  defaultTrack: ConferenceModel.Track
  colorForTrack: Record<string, [number, number, number, number]>
  trackMappings: Record<string, Array<string>>
  maps?: ConferenceModel.Map[]

  /** Map to Session ID to HTTPS url of a video stream to be added as a test stream */
  sessionsToVideoUrls?: Record<string, string>

  locationsToYouTubeLiveStream?: Record<string, string>

  youtubePlaylistId?: string
  /** Adds `/de|en/node/<nid>` as `alternate-link` to each session to help universal links along */
  addNodeAlternateLinksToSession?: boolean
}

export type Rp2APIElement = Record<string, string | Record<string, string> | Array<Record<string, string>>>

export function isRp2DataSourceFormat(dataSource: DataSourceFormat): dataSource is Rp2DataSourceFormat {
  return dataSource.format === "rp2";
}

enum Rp2APIEndpointName {
  speaker = "speaker",
  moderator = "moderator",
  session = "session",
  term = "term",
  partner = "partner",
  stage = "stage",
} 


async function loadJsonData(baseUrl: string, auth?: axios.AxiosBasicCredentials ): Promise<Record<keyof typeof Rp2APIEndpointName, Rp2APIElement[]>> {
  const load = async (name: Rp2APIEndpointName) => axios.default.get<Rp2APIElement[]>(`${baseUrl}/${name}.json`, { auth }).then(r => r.data)

  return {
    speaker: (await load(Rp2APIEndpointName.speaker)),
    moderator: (await load(Rp2APIEndpointName.moderator)),
    session: (await load(Rp2APIEndpointName.session)),
    term: (await load(Rp2APIEndpointName.term)),
    partner: (await load(Rp2APIEndpointName.partner)),
    stage: (await load(Rp2APIEndpointName.stage)),
  }
}

async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: Rp2DataSourceFormat): Promise<SourceData> {
  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences: [],
    maps: [],
    pois: [],
    tracks: [],
  };

  // Speakers
  const { 
    speaker,
    moderator,
    session,
    term,
    partner,
    stage
  } = await loadJsonData(source.dataBaseUrl, source.dataAuth);
  
  const tracks = term.map(t => trackFromApiTerm(t, {
    eventId: event.id, 
    defaultColor: source.defaultTrack.color, 
    colors: source.colorForTrack,
    trackMappings: source.trackMappings
  }))
    .filter(t => t !== null) as ConferenceModel.Track[];

  const deTrackTerms = term.filter(t => t.language === "de");
  tracks.forEach(track => {
    const trackNames = source.trackMappings[track.id];
    const deTrack = deTrackTerms.find(t => trackNames?.includes((t.name as string).toLowerCase()))
    if (deTrack && typeof deTrack.name === "string") {
      track.label_de = deTrack.name;
    }
  })
  result.tracks = tracks;

  const speakerParseOptions = {eventId: event.id, speakerUrlPrefix: source.speakerUrlPrefix}
  const speakers = speaker.map(s => speakerFromApiSpeaker(s, speakerParseOptions))
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const speakerIds = new Set(speakers.filter(s => s !== null).map(s => s!.id))
  moderator.forEach(m => {
    const mod = speakerFromApiSpeaker(m, speakerParseOptions)
    if (mod && !speakerIds.has(mod.id)) {
      speakers.push(mod)
    }
  })
  result.speakers = speakers.filter(s => s !== null) as ConferenceModel.Speaker[];

  let youtubeRecordingLinks: Record<string, ConferenceModel.Link> = {}
  if (source.youtubePlaylistId) {
    try {
      youtubeRecordingLinks = await youtubeUrlByTitle(source.youtubePlaylistId);
    } catch (error) {
      console.error(`Could not fetch YouTube Playlist data for id ${source.youtubePlaylistId}`, error)
    }
  }

  result.sessions = session.map(s => {
    const resultSession = sessionFromApiSession(s, stage, { 
      eventId: event.id, 
      sessionUrlPrefix: source.sessionUrlPrefix, 
      defaultTrack: source.defaultTrack,
      timezone: event.locations[0].timezone,
      trackMappings: source.trackMappings,
      locationsToYouTubeLiveStream: source.locationsToYouTubeLiveStream,
      partnerLinks: partnerLinks(partner),
      youtubeRecordingLinks,
      addNodeAlternateLinksToSession: source.addNodeAlternateLinksToSession ?? false,
    })
    if (source.sessionsToVideoUrls 
      && resultSession 
      && source.sessionsToVideoUrls[resultSession.id]) {
        resultSession.enclosures = resultSession.enclosures.concat([
          {
            url: source.sessionsToVideoUrls[resultSession.id],
            type: "livestream",
            title: resultSession.title,
            mimetype: "video/mp4"
          }
        ])
    }
    return resultSession;
  }).filter(s => s !== null) as ConferenceModel.Session[]

  const termSubconferences = term
    .map(t => subconferenceFromApiTerm(t, {eventId: event.id}))
    .filter(t => t !== null) as ConferenceModel.Subconference[];
  result.subconferences = termSubconferences;
  result.maps = source.maps ?? [];

  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const rp2Sources = sources.filter(s => s.format === 'rp2') as Rp2DataSourceFormat[];
  
  const promises = rp2Sources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}