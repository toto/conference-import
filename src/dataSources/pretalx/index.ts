import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";
import { PretalxDataSourceFormat, isPreTalksDataSourceFormat } from "./dataFormat";
import { sessionsFromJson } from './converters';
import { DataSourceFormat } from "../dataSource";

async function allPagesFromPretalx(config: PretalxDataSourceFormat, endpoint: "talks" | "speakers" |  "rooms") {
  const initialUrl = `${config.baseUrl}/api/events/${config.conferenceCode}/${endpoint}/`;
  let result: any[] = [];
  let nextPage = initialUrl;

  while (nextPage) {
    // eslint-disable-next-line
    const pageResult: axios.AxiosResponse<{next: string, results: any[]}> = await axios.default.get(nextPage);
    nextPage = pageResult.data.next;
    result = result.concat(pageResult.data.results);
  }
  return result;
}

async function sessionsFromPretalx(config: PretalxDataSourceFormat): Promise<ConferenceModel.Session[]> {
  const talks = await allPagesFromPretalx(config, "talks")
  return sessionsFromJson(talks, config);
}

// async function speakersFromPretalx(config: PretalxDataSourceFormat): Promise<ConferenceModel.Speaker[]> {
//   return [];
// }

// async function locationsFromPretalx(config: PretalxDataSourceFormat): Promise<ConferenceModel.Location[]> {
//   return [];
// }



async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: PretalxDataSourceFormat): Promise<SourceData> {
  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
    maps: [],
    pois: [],
  };

  result.sessions = await sessionsFromPretalx(source);

  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const pretalxSources = sources.filter(s => isPreTalksDataSourceFormat(s)) as PretalxDataSourceFormat[];
  
  const promises = pretalxSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}