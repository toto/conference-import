import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";
import { C3HubDataSourceFormat, isC3HubDataSourceFormat } from "./dataFormat";
import { sessionsFromJson, tracksFromJson } from "./converters";

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const c3HubSources = sources.filter(s => isC3HubDataSourceFormat(s)) as C3HubDataSourceFormat[];
  
  const promises = c3HubSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}

async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: C3HubDataSourceFormat): Promise<SourceData> {
  const maps: ConferenceModel.Map[] = [];
  const pois: ConferenceModel.POI[] = [];

  let sessions: ConferenceModel.Session[] = [];
  let tracks: ConferenceModel.Track[] = [];
  try {
    console.log(`c3hub: Loading from ${source.apiBaseUrl} for event ${source.eventId}`);
    tracks = await tracksFromC3Hub(source);
    sessions = await sessionsFromC3Hub(source);
  } catch (error) {
    console.error(`c3hub: Could not import sessions: ${error}`);
  }
  
  const { subconferenceId } = source;
  if (subconferenceId) {
    const subconference = subconferences.find(s => s.id === subconferenceId);
    if (subconference) {
      sessions.forEach(session => session.subconference = subconference);
    }
  }

  const result: SourceData = {
    speakers: [],
    sessions,
    days,
    event,
    subconferences,
    maps,
    pois,
    tracks,
  };

  console.log(`c3hub: ${result.sessions.length} sessions, ${result.speakers.length} speakers from ${source.apiBaseUrl} event ${source.eventId}`);
  return result;
}

async function sessionsFromC3Hub(config: C3HubDataSourceFormat): Promise<ConferenceModel.Session[]> {
  const response = await axios.default.get(`${config.apiBaseUrl}c/${config.apiEventId}/events`)
  return sessionsFromJson(response.data, config);
}

async function tracksFromC3Hub(config: C3HubDataSourceFormat): Promise<ConferenceModel.Track[]> {
  const response = await axios.default.get(`${config.apiBaseUrl}c/${config.apiEventId}/tracks`)
  return tracksFromJson(response.data, config);
}

