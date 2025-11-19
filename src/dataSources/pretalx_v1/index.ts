import * as axios from "axios";
import { PretalxV1SessionConfig, sessionsFromJson, speakersFromJson } from "./converters";
import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";
import { isPreTalxV1DataSourceFormat, PretalxV1DataSourceFormat } from "./dataFormat";
import { loadVocLiveStreams, addLiveStreamEnclosures } from "../voc-live/voc-live";
import { addRecordingEnclosues, addReliveEnclosures } from "../voc-vod/voc-vod";
import { SourceData } from "../../importer/sourceData";
import { URLSearchParams } from "url";

async function allPagesFromPretalxV1(config: PretalxV1DataSourceFormat, endpoint: "submissions" | "speakers"): Promise<any[]> {
      const params: Record<string, string> = {};
      if (endpoint === "submissions") {
          params["state"] = "confirmed";
          params["expand"] = "speakers,track,slot";
      }

      const paramsString = new URLSearchParams(params).toString();
      const initialUrl = `${config.baseUrl}api/events/${config.conferenceCode}/${endpoint}/?limit=500${paramsString.length > 0 ? `&${paramsString}` : ''}`;
      let result: Record<string, unknown>[] = [];
      let nextPage = initialUrl;
    
      while (nextPage) {
        // eslint-disable-next-line
        const pageResult: axios.AxiosResponse<{next: string, results: any[]}> = await axios.default.get(nextPage, {
          headers: config.apiKeyEnvVar ? {
            'Authorization': `Token ${process.env[config.apiKeyEnvVar]}`
          } : {}
        });
        nextPage = pageResult.data.next;
        result = result.concat(pageResult.data.results);
      }
      return result;
}

async function sessionsFromPretalxV1(config: PretalxV1SessionConfig): Promise<ConferenceModel.Session[]> {
  const talks = await allPagesFromPretalxV1(config, "submissions")
  return sessionsFromJson(talks, config);
}

async function speakersFromPretalxV1(config: PretalxV1SessionConfig): Promise<ConferenceModel.Speaker[]> {
  const speakers = await allPagesFromPretalxV1(config, "speakers")
  return speakersFromJson(speakers, config);
}

async function singleSourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], source: PretalxV1DataSourceFormat): Promise<SourceData> {
  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
    maps: [],
    pois: [],
  };

  console.log(`Pretalx V1: Loading from ${source.baseUrl}`);
  const sessions = await sessionsFromPretalxV1(source);
  const { subconferenceId } = source;
  if (subconferenceId) {
    const subconference = subconferences.find(s => s.id === subconferenceId);
    if (subconference) {
      sessions.forEach(session => session.subconference = subconference);
    }
  }
  result.sessions = sessions;
  result.speakers = await speakersFromPretalxV1(source);

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
  const pretalxSources = sources.filter(s => isPreTalxV1DataSourceFormat(s)) as PretalxV1DataSourceFormat[];
  
  const promises = pretalxSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}