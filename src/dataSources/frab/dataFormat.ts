import * as ConferenceModel from "../../models";
import { DataSourceFormat } from "../dataSource";

export function isFrabDataSourceFormat(dataSource: DataSourceFormat): dataSource is FrabDataSourceFormat {
  return dataSource.format === "frab";
}

export interface FrabDataSourceFormat extends DataSourceFormat {
  format: "frab";
  eventId: string;
  scheduleJson: string;
  /** Set to automatically generate speaker image urls and infer a speaker JSON url */
  frabBaseUrl?: string;
  /** If set will be preferred over infering the speakers url from frabBaseUrl */
  speakerJsonUrl?: string;
  defaultTrack: ConferenceModel.Track;
  defaultLanguageCode: string;
  subconferenceId?: string;
  filterSpeakerNames?: string[];
  filterSessionNames?: string[];
  maps?: ConferenceModel.Map[];
  pois?: ConferenceModel.POI[];
  timezone?: string;
  vocSlug?: string;
  /** Alternative live stream api url for VOC live streams
   *  Defaults to `https://streaming.media.ccc.de/streams/v2.json` if not set
   *  E.g. use `https://streaming.test.c3voc.de/streams/v2.json`
   */
  vocLiveStreamApiUrl?: string;
  /** Enable use of voc relive streams if the processing is not yet done */
  vocUseReliveRecordings?: boolean;

  /** Any session with location names listed here will not be imported at all */
  ignoredLocationNames?: string[];
  /** Ignored if preferGuid is true  */
  prefixSessionsWithEventId?: boolean;
  /** Ignored if preferGuid is true  */
  useSubconferenceIdInSessionId?: boolean;
  useSubconferenceIdInLocations?: boolean;
  fakeVideos?: any;
  /** uses a guid identifier for sessions if available  */
  preferGuid?: boolean;
  baseSpeakerIdOnName?: boolean;
  /** 
   * Set to true, to extract speakers and guess their deep links correctly
   * from a frab export mode. `pretalxBaseUrl` should be set to `https://HOST/PRETALX_CONF_ID/`
   */
  pretalxExportMode?: boolean;
  pretalxBaseUrl?: string

  /** 
   * Sources for speakers 
   * Prefer pretalx over `pretalxExportMode` 
   * Use togehter with `baseSpeakerIdOnName = true` for the source and the main import
   * to ensure connections between speakers from  sessions and speakers imported since there is 
   * no other way to map speakers from different sources. 
   **/
  speakerSources?: [
    {
      format: "pretalx",
      eventId: string,
      conferenceCode: string,
      baseUrl: string,
      baseSpeakerIdOnName?: boolean
    }
  ]
}

