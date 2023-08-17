import { DataSourceFormat } from "../dataSource";
import * as ConferenceModel from "../../models";

export function isC3HubDataSourceFormat(dataSource: DataSourceFormat): dataSource is C3HubDataSourceFormat {
  return dataSource.format === "c3hub";
}

export interface C3HubDataSourceFormat extends DataSourceFormat {
  format: "c3hub"
  /** re-data event id. e.g. `23c3` */
  eventId: string;

  /** Fallback track if no track is given */
  defaultTrack: ConferenceModel.Track;

  /** subconference id */
  subconferenceId?: string;


  /** Hub API conference ID of the event source. E.g. `camp23`
   * for `https://events.ccc.de/camp/2023/hub/api/c/camp23/`
   */
  apiEventId: string;
  /** Base URL of the API including protocol. 
   * E.g. `https://events.ccc.de/camp/2023/hub/api/` */
  apiBaseUrl: string;

  /** URL used for sharing sessions by attaching the slug */
  webSessionBaseUrl: string;

  /** Included kinds of sessions. Sessions with differnet kinds will be ignored. 
   * e.g. "sos" (self organized), "assembly"
    */
  includedKinds: string[];
}
