import * as axios from "axios";
import * as ConferenceModel from "../../models";
import { FrabDataSourceFormat, isFrabDataSourceFormat } from "./dataFormat";
import { sessionsFromJson, speakersFromJson } from './converters';
import { DataSourceFormat } from "../dataSource";
import { SourceData } from "../../importer/sourceData";
import { loadVocLiveStreams, addLiveStreamEnclosures } from "../voc-live";
import { addRecordingEnclosues } from "../voc-vod";

async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: FrabDataSourceFormat): Promise<SourceData> {
  const maps: ConferenceModel.Map[] = source.maps !== undefined ? source.maps : [];
  const pois: ConferenceModel.POI[] = source.pois !== undefined ? source.pois : [];

  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
    maps,
    pois,
  };
  
  const schedule = await axios.default.get(source.scheduleJson);
  const sessions = sessionsFromJson(schedule.data, source);
  const { subconferenceId } = source;
  if (subconferenceId) {
    const subconference = subconferences.find(s => s.id === subconferenceId);
    if (subconference) {
      sessions.forEach(session => session.subconference = subconference);
    }
  }
  result.sessions = sessions;

  if (source.frabBaseUrl) {
    const speakers = await axios.default.get(`${source.frabBaseUrl}/speakers.json`);
    result.speakers = speakersFromJson(speakers.data, source);
  }
  
  if (source.vocSlug) {
    const vocStreams = await loadVocLiveStreams(source.vocSlug);
    result.sessions = addLiveStreamEnclosures(result.sessions, vocStreams);

    result.sessions = await addRecordingEnclosues(source.vocSlug, result.sessions);
  }

  if (source.fakeVideos) {
    for (const sessionId of Object.keys(source.fakeVideos)) {
      const video: ConferenceModel.Enclosure = source.fakeVideos[sessionId];
      for (const session of result.sessions) {
        if (session.id === sessionId) {
          session.enclosures.push(video);
        }
      }
    }
  }

  console.log(`Frab: ${result.sessions.length} sessions, ${result.speakers.length} speakers`);
  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const frabSources = sources.filter(s => isFrabDataSourceFormat(s)) as FrabDataSourceFormat[];
  
  const promises = frabSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}