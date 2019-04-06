import * as axios from "axios";
import { DataSourceFormat } from "../dataSource";
import { Event } from "../../models";
import * as converters from './converters';
import { ConferenceData } from "../../importer/importer";


export interface OcDataSourceFormat extends DataSourceFormat {
  format: "ocdata"
  baseUrl: string;
};

export function isOcDataSourceFormat(dataSource: DataSourceFormat): dataSource is OcDataSourceFormat {
  return dataSource.format === "ocdata";
}

export async function sourceData(event: Event, sources: DataSourceFormat[]) {
  const ocSources = sources.filter(s => isOcDataSourceFormat(s)) as OcDataSourceFormat[];
  
  const promises = ocSources.map(source => singleSourceData(event, source));
  return Promise.all(promises);
}

async function singleSourceData(event: Event, source: OcDataSourceFormat): Promise<ConferenceData> {
  const result: ConferenceData = {
    speakers: [],
    sessions: [],
    days: [],
    event,
    subconferences: [],
    tracks: [],
    locations: [],
  };

  const loadingPromises = [];
  loadingPromises.push(axios.default.get(`${source.baseUrl}/speakers`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/sessions`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/days`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/tracks`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/locations`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/subconferences`));

  const [ 
    speakersJSON, 
    sessionsJSON,
    daysJSON,
    tracksJSON,
    locatonsJSON,
    subconferencesJSON,
  ] = await Promise.all(loadingPromises);

  result.speakers = converters.speakersFromJson(speakersJSON.data.data);
  result.sessions = converters.sessionsFromJson(sessionsJSON.data.data);
  result.days = converters.daysFromJson(daysJSON.data.data);
  result.tracks = converters.tracksFromJson(tracksJSON.data.data);
  result.locations = converters.locationsFromJson(locatonsJSON.data.data);
  result.subconferences = converters.subconferencesFromJson(subconferencesJSON.data.data);
  
  return result;
}