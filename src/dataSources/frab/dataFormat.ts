import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";

export function isFrabDataSourceFormat(dataSource: DataSourceFormat): dataSource is FrabDataSourceFormat {
  return dataSource.format === "frab";
}

export interface FrabDataSourceFormat extends DataSourceFormat {
  format: "frab";
  eventId: string;
  scheduleJson: string;
  frabBaseUrl?: string;
  defaultTrack: ConferenceModel.Track;
  defaultLanguageCode: string;
  subconferenceId?: string;
  filterSpeakerNames?: string[];
  filterSessionNames?: string[];
  maps?: ConferenceModel.Map[];
  pois?: ConferenceModel.POI[];
  timezone?: string;
  vocSlug?: string;
  // Any session with location names listed here will not be imported at all
  ignoredLocationNames?: string[];
};

