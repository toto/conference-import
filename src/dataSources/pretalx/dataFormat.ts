import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";

export function isPreTalksDataSourceFormat(dataSource: DataSourceFormat): dataSource is PretalxDataSourceFormat {
  return dataSource.format === "pretalx";
}

export interface PretalxDataSourceFormat extends DataSourceFormat {
  format: "pretalx";
  eventId: string;
  baseUrl: string;
  conferenceCode: string;
  defaultTrack: ConferenceModel.Track;
  defaultLanguageCode: string;
  subconferenceId?: string;
  filterSpeakerNames?: string[];
  filterSessionNames?: string[];
  maps?: ConferenceModel.Map[];
  timezone?: string;
};
