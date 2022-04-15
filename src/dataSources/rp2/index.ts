import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";

import { DataSourceFormat } from "../dataSource";
import { speakerFromApiSpeaker } from "./speaker";

export interface Rp2DataSourceFormat extends DataSourceFormat {
  format: "rp2"
  dataBaseUrl: string
  speakerUrlPrefix: string
  dataAuth?: { username: string, password: string }
}

export type Rp2APIElement = Record<string, string | Record<string, string> | Array<Record<string, string>>>

export function isRp2DataSourceFormat(dataSource: DataSourceFormat): dataSource is Rp2DataSourceFormat {
  return dataSource.format === "rp2";
}

enum Rp2APIEndpointName {
  speaker = "speaker",
  moderator = "moderator",
} 


async function loadJsonData(baseUrl: string, auth?: axios.AxiosBasicCredentials ): Promise<Record<keyof typeof Rp2APIEndpointName, Rp2APIElement[]>> {

  const load = async (name: Rp2APIEndpointName) => axios.default.get<Rp2APIElement[]>(`${baseUrl}/${name}.json`, { auth }).then(r => r.data)

  return {
    speaker: (await load(Rp2APIEndpointName.speaker)),
    moderator: (await load(Rp2APIEndpointName.moderator)),
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
  };

  // Speakers
  const { speaker, moderator } = await loadJsonData(source.dataBaseUrl, source.dataAuth);
  const speakerParseOptions = {eventId: event.id, speakerUrlPrefix: source.speakerUrlPrefix}
  const speakers = speaker.map(s => speakerFromApiSpeaker(s, speakerParseOptions))
  const speakerIds = new Set(speakers.filter(s => s !== null).map(s => s!.id))
  moderator.forEach(m => {
    const moderator = speakerFromApiSpeaker(m, speakerParseOptions)
    if (moderator && !speakerIds.has(moderator.id)) {
      speakers.push(moderator)
    }
  })
  result.speakers = speakers as ConferenceModel.Speaker[];


  result.maps = [];

  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const rp2Sources = sources.filter(s => s.format === 'rp2') as Rp2DataSourceFormat[];
  console.log("Sources", rp2Sources)
  
  const promises = rp2Sources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}