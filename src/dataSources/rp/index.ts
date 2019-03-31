import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import { Event, Day, Subconference } from "../../models";
import { sessionsFromJson } from "./sessions";
import { speakersFromJson } from "./speakers";
import { DataSourceFormat } from "../dataSource";

export interface RpDataSourceFormat extends DataSourceFormat {
  format: "rp"
  speakersUrl: any;
  sessionLinkBaseUrl: string;
  sessionsUrl: any;
  speakerLinkBaseUrl: string;
  speakerImageBaseUrl: string;
};

export function isRpDataSourceFormat(dataSource: DataSourceFormat): dataSource is RpDataSourceFormat {
  return dataSource.format === "rp";
}

async function singleSourceData(event: Event, days: Day[], subconferences: Subconference[], source: RpDataSourceFormat): Promise<SourceData> {
  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
  };

  const speakersJSON = await axios.default.get(source.speakersUrl);
  const sessionsJSON = await axios.default.get(source.sessionsUrl);

  result.speakers = result.speakers.concat(
    speakersFromJson(speakersJSON.data, {
      eventId: event.id,
      speakerLinkPrefix: source.speakerLinkBaseUrl,
      picturePrefix: source.speakerImageBaseUrl,
    })
  );

  const [ firstLocation ] = event.locations
  result.sessions = result.sessions.concat(
    sessionsFromJson(sessionsJSON.data, {
      eventId: event.id,
      sessionLinkPrefix: source.sessionLinkBaseUrl,
      timezone: firstLocation.timezone,
    })
  );

  return result;
}

export async function sourceData(event: Event, days: Day[], subconferences: Subconference[], sources: DataSourceFormat[]) {
  const rpSources = sources.filter(s => s.format === 'rp') as RpDataSourceFormat[];
  
  const promises = rpSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}
