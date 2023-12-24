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
  };

  /** Slug of the the assembly not considered a subconference (e.g. "ccc") */
  mainConferenceAssemblySlug?: string;
}
