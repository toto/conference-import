import * as axios from "axios";
import { DataSourceFormat } from "../dataSource";
import { Event, Track, Subconference, Day, Enclosure } from "../../models";
import { speakersFromJson, sessionsFromJson } from "./converters";
import { SourceData } from "../../importer/sourceData";

export interface HalfnarpSourceFormat extends DataSourceFormat {
  format: "halfnarp";
  eventId: string;
  sourceUrl: string;
  sessionBaseUrl: string;
  speakerBaseUrl: string;
  defaultTrack: Track;
  defaultLanguageCode: string;
  tracks: Track[];
  trackIdMap: Record<string, string>;
  timezone?: string;
  vocSlug?: string;
  fakeVideos?: Record<string, Enclosure>;
}

export function isHalfnarpSourceFormat(dataSource: DataSourceFormat): dataSource is HalfnarpSourceFormat {
  return dataSource.format === "halfnarp";
}

export async function sourceData(event: Event, days: Day[], subconferences: Subconference[], sources: DataSourceFormat[]) {
  const halfnarpSources = sources.filter(s => isHalfnarpSourceFormat(s)) as HalfnarpSourceFormat[];
  
  const promises = halfnarpSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}

async function singleSourceData(event: Event, days: Day[], subconferences: Subconference[], source: HalfnarpSourceFormat): Promise<SourceData> {
  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
    maps: [],
    pois: [],
    tracks: source.tracks,
  };
  
  const halfnarpJson = await axios.default.get(source.sourceUrl);

  result.speakers = speakersFromJson(halfnarpJson.data, source);
  result.sessions = sessionsFromJson(halfnarpJson.data, source);
  
  if (source.fakeVideos) {
    for (const sessionId of Object.keys(source.fakeVideos)) {
      const video: Enclosure = source.fakeVideos[sessionId];
      for (const session of result.sessions) {
        if (session.id === sessionId) {
          session.enclosures.push(video);
        }
      }
    }
  }

  console.log(`Halfnarp: ${result.sessions.length} sessions, ${result.speakers.length} speakers from ${source.sourceUrl}`);

  return result;
}