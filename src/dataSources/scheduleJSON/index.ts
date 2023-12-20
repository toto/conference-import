import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";
import { ScheduleJSONDataSourceFormat, isScheduleJSONDataSourceFormat } from "./dataFormat";
import { locationsFromJSON, sessionsFromJson, speakersFromJson, tracksFromJson } from "./converters";
import { loadVocLiveStreams, addLiveStreamEnclosures, VocLiveMediaType, VocLiveStreamType } from "../voc-live";
import { addRecordingEnclosues, addReliveEnclosures } from "../voc-vod";

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
    const sessionsResult = await sessionsFromSchedule(source)
    sessions = sessionsResult.sessions;
    result.tracks = sessionsResult.tracks;
    result.locations = sessionsResult.locations;
    speakers = await speakersFromSpeakersJSON(source)
  } catch (error) {
    console.error(`ScheduleJSON: Could not load data: ${error}`)
  }

  result.sessions = sessions;
  result.speakers = speakers;

  if (source.voc?.slug) {
    const vocStreams = await loadVocLiveStreams(source.voc?.slug, VocLiveMediaType.video, VocLiveStreamType.hls, source.voc.liveStreamApiUrl);
    result.sessions = addLiveStreamEnclosures(result.sessions, vocStreams);

    result.sessions = await addRecordingEnclosues(source.voc?.slug, result.sessions, true);
    if (source.voc?.useReliveRecordings === true) {
      result.sessions = await addReliveEnclosures(source.voc?.slug, result.sessions);
    }
  }

  console.log(`ScheduleJSON: ${result.sessions.length} sessions, ${result.speakers.length} speakers from ${source.scheduleURL}`);
  return result;
}

interface SessionsDataResult {
  sessions: ConferenceModel.Session[]
  tracks: ConferenceModel.Track[]
  locations: ConferenceModel.Location[]
}

async function sessionsFromSchedule(config: ScheduleJSONDataSourceFormat): Promise<SessionsDataResult> {
  const response = await axios.default.get(config.scheduleURL);
  const { locations } = locationsFromJSON(response.data, config)
  const sessions = sessionsFromJson(response.data, locations, config);
  const tracks = tracksFromJson(response.data, config);
  return { sessions, tracks, locations };
}

async function speakersFromSpeakersJSON(config: ScheduleJSONDataSourceFormat): Promise<ConferenceModel.Speaker[]> {
  if (!config.speakers) throw new Error("speakersURL missing in config");
  const response = await axios.default.get(config.speakers.jsonURL)
  return speakersFromJson(response.data, config);
}