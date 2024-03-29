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
  vocSlug?: string;
  /** Slug to be used for detecting live video streams. Will be preferred over vocSlug if both are set. */
  vocLiveSlug?: string;
  vocUseReliveRecordings?: boolean;
  /** If this is set all these locations will be considered beeing recorded unless specifiedotherwise */
  recordedLocationIds?: string[];
  useSubconferenceIdInSessionId?: boolean;
  useSubconferenceIdInLocations?: boolean;
  fakeVideos?: Record<string, ConferenceModel.Enclosure>;
}
