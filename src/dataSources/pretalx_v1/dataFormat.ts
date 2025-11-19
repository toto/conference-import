import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";

export interface PretalxV1DataSourceFormat extends DataSourceFormat {
  format: "pretalx_v1";
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
  /** If set is the key of the env variable that contains the API key */
  apiKeyEnvVar?: string;
}

export function isPreTalxV1DataSourceFormat(dataSource: DataSourceFormat): dataSource is PretalxV1DataSourceFormat {
  return dataSource.format === "pretalx_v1";
}
