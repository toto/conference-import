import * as axios from "axios";
import * as ConferenceModel from "../../models";
import { FrabDataSourceFormat, isFrabDataSourceFormat } from "./dataFormat";
import { sessionsFromJson, speakersFromJson } from './converters';
import { DataSourceFormat } from "../dataSource";
import { SourceData } from "../../importer/sourceData";

async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: FrabDataSourceFormat): Promise<SourceData> {
  const maps: ConferenceModel.Map[] = source.maps !== undefined ? source.maps : [];

  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
    maps,
  };

  const schedule = await axios.default.get(`${source.frabBaseUrl}/schedule.json`);
  const speakers = await axios.default.get(`${source.frabBaseUrl}/speakers.json`)
  result.sessions = sessionsFromJson(schedule.data, source);
  result.speakers = speakersFromJson(speakers.data, source);
  console.log(`Frab: ${result.sessions.length} sessions, ${result.speakers.length} speakers`);
  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const frabSources = sources.filter(s => isFrabDataSourceFormat(s)) as FrabDataSourceFormat[];
  
  const promises = frabSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}