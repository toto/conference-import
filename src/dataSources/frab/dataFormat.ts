import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";

export function isFrabDataSourceFormat(dataSource: DataSourceFormat): dataSource is FrabDataSourceFormat {
  return dataSource.format === "pretalx";
}

export interface FrabDataSourceFormat extends DataSourceFormat {
  format: "frab";
  eventId: string;
  frabBaseUrl: string;
  defaultTrack: ConferenceModel.Track;
  defaultLanguageCode: string;
  subconferenceId?: string;
  filterSpeakerNames?: string[];
  filterSessionNames?: string[];
  maps?: ConferenceModel.Map[];
  timezone?: string;
};

