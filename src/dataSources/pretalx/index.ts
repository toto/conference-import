import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import * as ConferenceModel from "../../models";
import { PretalxDataSourceFormat, isPreTalksDataSourceFormat } from "./dataFormat";
import { PretalxSessionConfig, sessionsFromJson, speakersFromJson } from './converters';
import { DataSourceFormat } from "../dataSource";
import { loadVocLiveStreams, addLiveStreamEnclosures } from "../voc-live/voc-live";
import { addRecordingEnclosues, addReliveEnclosures } from "../voc-vod/voc-vod";

async function allPagesFromPretalx(config: PretalxSessionConfig, endpoint: "talks" | "speakers" |  "rooms") {
  const initialUrl = `${config.baseUrl}api/events/${config.conferenceCode}/${endpoint}/?limit=500`;
  let result: Record<string, unknown>[] = [];
  let nextPage = initialUrl;

  while (nextPage) {
    // eslint-disable-next-line
    const pageResult: axios.AxiosResponse<{next: string, results: any[]}> = await axios.default.get(nextPage);
    nextPage = pageResult.data.next;
    result = result.concat(pageResult.data.results);
  }
  return result;
}

async function sessionsFromPretalx(config: PretalxSessionConfig): Promise<ConferenceModel.Session[]> {
  const talks = await allPagesFromPretalx(config, "talks")
  return sessionsFromJson(talks, config);
}

async function speakersFromPretalx(config: PretalxSessionConfig): Promise<ConferenceModel.Speaker[]> {
  const speakers = await allPagesFromPretalx(config, "speakers")
  return speakersFromJson(speakers, config);
}

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

  console.log(`Pretalx: Loading from ${source.baseUrl}`);
  const sessions = await sessionsFromPretalx(source);
  const { subconferenceId } = source;
  if (subconferenceId) {
    const subconference = subconferences.find(s => s.id === subconferenceId);
    if (subconference) {
      sessions.forEach(session => session.subconference = subconference);
    }
  }
  result.sessions = sessions;
  result.speakers = await speakersFromPretalx(source);

  const liveSlug = source.vocLiveSlug ?? source.vocSlug;
  if (liveSlug) {
    const vocStreams = await loadVocLiveStreams(liveSlug);
    result.sessions = addLiveStreamEnclosures(result.sessions, vocStreams);
  }
  if (source.vocSlug) {
    result.sessions = await addRecordingEnclosues(source.vocSlug, result.sessions);
    if (source.vocUseReliveRecordings === true) {
      result.sessions = await addReliveEnclosures(source.vocSlug, result.sessions);
    }
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

  console.log(`Pretalx: ${result.sessions.length} sessions, ${result.speakers.length} speakers from ${source.baseUrl}`);
  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const pretalxSources = sources.filter(s => isPreTalksDataSourceFormat(s)) as PretalxDataSourceFormat[];
  
  const promises = pretalxSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}