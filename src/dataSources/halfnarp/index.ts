import * as axios from "axios";
import { DataSourceFormat } from "../dataSource";
import { Event, Track, Subconference, Day } from "../../models";
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
  trackIdMap: any;
  timezone?: string;
  vocSlug?: string;
};

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
    pois: []
  };
  
  const halfnarpJson = await axios.default.get(source.sourceUrl);

  result.speakers = speakersFromJson(halfnarpJson.data, source);
  result.sessions = sessionsFromJson(halfnarpJson.data, source);
  // console.log(JSON.stringify(halfnarpJson, null, 4));

  return result;
}