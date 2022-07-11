import * as axios from "axios";

import * as ConferenceModel from "../../models";
import { FrabDataSourceFormat, isFrabDataSourceFormat } from "./dataFormat";
import { 
  miniSpeakerToSpeaker,
  sessionsFromJson,
  speakersFromJson,
  pretalxSpeakersFromSessionJson,
} from './converters';
import { DataSourceFormat } from "../dataSource";
import { SourceData } from "../../importer/sourceData";
import { loadVocLiveStreams, addLiveStreamEnclosures, VocLiveMediaType, VocLiveStreamType } from "../voc-live";
import { addRecordingEnclosues, addReliveEnclosures } from "../voc-vod";

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
  // Just for app review remove some trigger words
  // result.sessions = result.sessions
  //   .filter(session => !session.title.match(/Hack/i))
  //   .filter(session => !session.title.match(/covid/i))

  let speakersUrl: string | undefined
  if (source.speakerJsonUrl) {
    speakersUrl = source.speakerJsonUrl
  } else if (source.frabBaseUrl) {
    speakersUrl = `${source.frabBaseUrl}/speakers.json`
  }
  if (speakersUrl) {
    try {
      const speakers = await axios.default.get(speakersUrl);
      result.speakers = speakersFromJson(speakers.data, source);
    } catch (error) {
      console.error(`frab-importer: Could not import speakers: ${error}`);
      result.speakers = [];
    }
  }

  sessions.forEach(session => {
    const findSpeaker = (speakerId: string) => {
      return result.speakers.find(s => s.id === speakerId)
    } 
    const speakersNotInFullSpeakersList = session.speakers.filter(speaker => {
      findSpeaker(speaker.id)
    }).map(miniSpeaker => miniSpeakerToSpeaker(miniSpeaker, source));
    result.speakers = result.speakers.concat(speakersNotInFullSpeakersList);
  })

  if (source.pretalxExportMode) {
    result.speakers = pretalxSpeakersFromSessionJson(schedule.data, source);
  }
  
  if (source.vocSlug) {
    const vocStreams = await loadVocLiveStreams(source.vocSlug, VocLiveMediaType.video, VocLiveStreamType.hls, source.vocLiveStreamApiUrl);
    result.sessions = addLiveStreamEnclosures(result.sessions, vocStreams);

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

  console.log(`Frab: ${result.sessions.length} sessions, ${result.speakers.length} speakers from ${source.scheduleJson}`);
  return result;
}

export async function sourceData(event: ConferenceModel.Event, days: ConferenceModel.Day[], subconferences: ConferenceModel.Subconference[], sources: DataSourceFormat[]) {
  const frabSources = sources.filter(s => isFrabDataSourceFormat(s)) as FrabDataSourceFormat[];
  
  const promises = frabSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}