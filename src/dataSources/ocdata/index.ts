import * as axios from "axios";
import { DataSourceFormat } from "../dataSource";
import { Event } from "../../models";
import * as converters from './converters';
import { ConferenceData } from "../../importer/importer";


export interface OcDataSourceFormat extends DataSourceFormat {
  format: "ocdata"
  baseUrl: string;
  testData: {
    speakerToActivityPubLink?: Record<string, string>
    sessionToActivityPubLink?: Record<string, string>
  }
}

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
    maps: [],
  };

  const loadingPromises = [];
  loadingPromises.push(axios.default.get(`${source.baseUrl}/speakers`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/sessions`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/days`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/tracks`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/locations`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/subconferences`));
  loadingPromises.push(axios.default.get(`${source.baseUrl}/maps`));

  const [ 
    speakersJSON, 
    sessionsJSON,
    daysJSON,
    tracksJSON,
    locatonsJSON,
    subconferencesJSON,
    mapsJSON,
  ] = await Promise.all(loadingPromises);

  result.speakers = converters.speakersFromJson(speakersJSON.data.data, source);
  result.sessions = converters.sessionsFromJson(sessionsJSON.data.data, source);
  result.days = converters.daysFromJson(daysJSON.data.data);
  result.days = converters.mergeWithoutDuplication(result.sessions.map(s => s.day) , result.days);
  result.tracks = converters.tracksFromJson(tracksJSON.data.data);
  result.locations = converters.locationsFromJson(locatonsJSON.data.data);
  result.maps = converters.mapsFromJson(mapsJSON.data.data);
  result.subconferences = converters.subconferencesFromJson(subconferencesJSON.data.data);
  result.subconferences = converters.mergeWithoutDuplication(result.sessions.map(s => s.subconference) , result.subconferences);

  return result;
}