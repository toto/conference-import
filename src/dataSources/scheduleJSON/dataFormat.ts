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

  /** Optional URL of speakers JSON */
  speakersURL?: string;
}
