import { DataSourceFormat } from "../dataSource";
import * as ConferenceModel from "../../models";

export function isScheduleJSONDataSourceFormat(dataSource: DataSourceFormat): dataSource is ScheduleJSONDataSourceFormat {
  return dataSource.format === "scheduleJSON";
}

export interface ScheduleJSONDataSourceFormat extends DataSourceFormat {
  format: "scheduleJSON"
  
  /** re-data event id. e.g. `23c3` */
  eventId: string;

  /** Fallback track if no track is given */
  defaultTrack: ConferenceModel.Track;

  /** subconference id */
  subconferenceId?: string;

  /** URL of schedule JSON */
  scheduleURL: string;

  /** Use only if speakers.json should be used to source the speakers */
  speakers?: {
    /** Optional URL of speakers JSON */
    jsonURL: string, 
    /** Prefix of Image path. Should not end with a `/` */
    imageBaseURL: string
  };

  /* VOC Streams  */
  voc?: {
    slug: string;
  /** Alternative live stream api url for VOC live streams
   *  Defaults to `https://streaming.media.ccc.de/streams/v2.json` if not set
   *  E.g. use `https://streaming.test.c3voc.de/streams/v2.json`
   */    
    liveStreamApiUrl?: string;
    /** Enable use of voc relive streams if the processing is not yet done */
    useReliveRecordings?: boolean;

    /** will be recorded will be set to `true` for any session where the location is 
     *  one of these IDs (Unless `do_not_record` is `true` for the session) */
    recordedLocationIds?: string[];
  };

  /** Set a fake enclosure for arbitray session IDs (e.g. for App Review) */
  fakeVideos?:  Record<string, ConferenceModel.Enclosure>;

  /** Config for c3nav link integration */
  c3nav?: {
    /** Base Url prefix like `https://37c3.c3nav.de/l/` */
    baseUrl: string;
    /** Set location id to c3nav slug (which is not the room slug) */
    locationIdToNavSlug: Record<string, string>;
  };

  /** Slug of the the assembly not considered a subconference (e.g. "ccc") */
  mainConferenceAssemblySlug?: string;
}
