import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";

import { DataSourceFormat } from "../dataSource";
import { sessionFromApiSession } from "./session";
import { speakerFromApiSpeaker } from "./speaker";
import { subconferenceFromApiTerm } from "./term";

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
} 


async function loadJsonData(baseUrl: string, auth?: axios.AxiosBasicCredentials ): Promise<Record<keyof typeof Rp2APIEndpointName, Rp2APIElement[]>> {
  const load = async (name: Rp2APIEndpointName) => axios.default.get<Rp2APIElement[]>(`${baseUrl}/${name}.json`, { auth }).then(r => r.data)

  return {
    speaker: (await load(Rp2APIEndpointName.speaker)),
    moderator: (await load(Rp2APIEndpointName.moderator)),
    session: (await load(Rp2APIEndpointName.session)),
    term: (await load(Rp2APIEndpointName.term)),
  }
}

async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: Rp2DataSourceFormat): Promise<SourceData> {
  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
    maps: [],
    pois: [],
    tracks: [],
  };

  // Speakers
  const { speaker, moderator, session, term } = await loadJsonData(source.dataBaseUrl, source.dataAuth);
  console.info(`L`)
  // const tracks = term.map(t => trackFromApiTerm(t, {
  //   eventId: event.id, 
  //   defaultColor: source.defaultTrack.color, 
  //   colors: source.colorForTrack,
  //   trackMappings: source.trackMappings
  // }))
  //   .filter(t => t !== null) as ConferenceModel.Track[];
  // result.tracks = tracks;

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
  result.speakers = speakers as ConferenceModel.Speaker[];


  result.sessions = session.map(s => {
    const resultSession = sessionFromApiSession(s, { 
      eventId: event.id, 
      sessionUrlPrefix: source.sessionUrlPrefix, 
      defaultTrack: source.defaultTrack,
      timezone: event.locations[0].timezone,
      trackMappings: source.trackMappings,
      locationsToYouTubeLiveStream: source.locationsToYouTubeLiveStream,
    })
    if (source.sessionsToVideoUrls 
      && resultSession 
      && source.sessionsToVideoUrls[resultSession.id]) {
        resultSession.enclosures = resultSession.enclosures.concat([
          {
            url: source.sessionsToVideoUrls[resultSession.id],
            type: "recording",
            title: resultSession.title,
            mimetype: "video/mp4"
          }
        ])
    }
    return resultSession;
  }).filter(s => s !== null) as ConferenceModel.Session[]

  result.subconferences = term.map(t => subconferenceFromApiTerm(t, {eventId: event.id}))
                            .filter(t => t !== null) as ConferenceModel.Subconference[];

  result.maps = source.maps ?? [];

  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const rp2Sources = sources.filter(s => s.format === 'rp2') as Rp2DataSourceFormat[];
  
  const promises = rp2Sources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}