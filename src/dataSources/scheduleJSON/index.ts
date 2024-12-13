import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";
import { ScheduleJSONDataSourceFormat, isScheduleJSONDataSourceFormat } from "./dataFormat";
import { AlternateUrlSource, locationsFromJSON, sessionsFromJson, speakersFromJson, speakersFromSessionJson, subsconferencesFromSessionJson, tracksFromJson } from "./converters";
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
    speakers = sessionsResult.speakers;
    result.tracks = sessionsResult.tracks;
    result.locations = sessionsResult.locations;
    
    if (source.speakers) {
      // TODO: Merge the speakers with the previous ones
      speakers = await speakersFromSpeakersJSON(source)
    }

    // dedupe subconferences
    const subconferencesMap: Map<string, ConferenceModel.Subconference> = new Map();
    subconferences.forEach(s => subconferencesMap.set(s.id, s)) 
    sessionsResult.subconferences.forEach(s => subconferencesMap.set(s.id, s))

    result.subconferences = Array.from(subconferencesMap.values())  
  } catch (error) {
    console.error(`ScheduleJSON: Could not load data: ${error}`)
    throw new Error(`ScheduleJSON: Could not load data due to source error. Refusing to import empty data.`)
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
  speakers: ConferenceModel.Speaker[]
  subconferences: ConferenceModel.Subconference[]
}

async function sessionsFromSchedule(config: ScheduleJSONDataSourceFormat): Promise<SessionsDataResult> {
  const response = await axios.default.get(config.scheduleURL);
  let alternateUrlSource: AlternateUrlSource | null = null;
  if (config.alternateSessionLinkScheduleURL) {
    const response = await axios.default.get<AlternateUrlSource>(config.alternateSessionLinkScheduleURL)
    alternateUrlSource = response.data
  }
  const { locations } = locationsFromJSON(response.data, config)
  const sessions = sessionsFromJson(response.data, locations, alternateUrlSource, config);
  const tracks = tracksFromJson(response.data, config);
  const speakers = speakersFromSessionJson(response.data, config);
  const subconferences = subsconferencesFromSessionJson(response.data, config);
  return { sessions, tracks, locations, speakers, subconferences };
}

async function speakersFromSpeakersJSON(config: ScheduleJSONDataSourceFormat): Promise<ConferenceModel.Speaker[]> {
  if (!config.speakers) throw new Error("speakersURL missing in config");
  const response = await axios.default.get(config.speakers.jsonURL)
  return speakersFromJson(response.data, config);
}