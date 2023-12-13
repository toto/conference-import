import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";
import { ScheduleJSONDataSourceFormat, isScheduleJSONDataSourceFormat } from "./dataFormat";
import { sessionsFromJson } from "./converters";

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const pretalxSources = sources.filter(s => isScheduleJSONDataSourceFormat(s)) as [];
  
  const promises = pretalxSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}

async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: ScheduleJSONDataSourceFormat): Promise<SourceData> {
  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
    maps: [],
    pois: [],
  };

  let sessions: ConferenceModel.Session[] = []
  try {
    sessions = await sessionsFromSchedule(source)
  } catch (error) {
    console.error(`ScheduleJSON: Could not load data: ${error}`)
  }

  result.sessions = sessions;

  console.log(`ScheduleJSON: ${result.sessions.length} sessions, ${result.speakers.length} speakers from ${source.scheduleURL}`);
  return result;
}

async function sessionsFromSchedule(config: ScheduleJSONDataSourceFormat): Promise<ConferenceModel.Session[]> {
  const response = await axios.default.get(config.scheduleURL)
  return sessionsFromJson(response.data, config);
}