import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";
import { ScheduleJSONDataSourceFormat, isScheduleJSONDataSourceFormat } from "./dataFormat";
import { sessionsFromJson, speakersFromJson, tracksFromJson } from "./converters";

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
  let speakers: ConferenceModel.Speaker[] = []
  try {
    const sessionsAndTracks = await sessionsFromSchedule(source)
    sessions = sessionsAndTracks.sessions;
    result.tracks = sessionsAndTracks.tracks;
    speakers = await speakersFromSpeakersJSON(source)
  } catch (error) {
    console.error(`ScheduleJSON: Could not load data: ${error}`)
  }

  result.sessions = sessions;
  result.speakers = speakers;

  console.log(`ScheduleJSON: ${result.sessions.length} sessions, ${result.speakers.length} speakers from ${source.scheduleURL}`);
  return result;
}

async function sessionsFromSchedule(config: ScheduleJSONDataSourceFormat): Promise<{sessions: ConferenceModel.Session[], tracks: ConferenceModel.Track[]}> {
  const response = await axios.default.get(config.scheduleURL);
  const sessions = sessionsFromJson(response.data, config);
  const tracks = tracksFromJson(response.data, config);
  return { sessions, tracks };
}

async function speakersFromSpeakersJSON(config: ScheduleJSONDataSourceFormat): Promise<ConferenceModel.Speaker[]> {
  if (!config.speakers) throw new Error("speakersURL missing in config");
  const response = await axios.default.get(config.speakers.jsonURL)
  return speakersFromJson(response.data, config);
}