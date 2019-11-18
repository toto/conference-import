import * as axios from "axios";
import { DataSourceFormat } from "../dataSource";
import { Event, Track } from "../../models";
import { ConferenceData } from "../../importer/importer";

export interface HalfnarpSourceFormat extends DataSourceFormat {
  format: "halfnarp";
  eventId: string;
  sourceUrl: string;
  sessionBaseUrl: string;
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

export async function sourceData(event: Event, sources: DataSourceFormat[]) {
  const ocSources = sources.filter(s => isHalfnarpSourceFormat(s)) as HalfnarpSourceFormat[];
  
  const promises = ocSources.map(source => singleSourceData(event, source));
  return Promise.all(promises);
}

async function singleSourceData(event: Event, source: HalfnarpSourceFormat): Promise<ConferenceData> {
  const result: ConferenceData = {
    speakers: [],
    sessions: [],
    days: [],
    event,
    subconferences: [],
    tracks: source.tracks,
    locations: [],
    maps: [],
  };

  
  const halfnarpJson = await axios.default.get(source.sourceUrl);
  console.log(JSON.stringify(halfnarpJson, null, 4));

  return result;
}