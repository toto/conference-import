import { SourceData } from "../../importer/sourceData";
import { Event, Day, Subconference } from "../../models";
import { readFileSync } from "fs";
import { sessionsFromJson } from "./sessions";
import { speakersFromJson } from "./speakers";
import { DataSourceFormat } from "../dataSource";

export interface RpDataSourceFormat extends DataSourceFormat {
  format: "rp"
  sessionsPath: string;
  sessionLinkBaseUrl: string;
  speakersPath: string;
  speakerLinkBaseUrl: string;
  speakerImageBaseUrl: string;
  sessionBaseUrl: string;
};

export function isRpDataSourceFormat(dataSource: DataSourceFormat): dataSource is RpDataSourceFormat {
  return dataSource.format === "rp";
}

export function sourceData(event: Event, days: Day[], subconferences: Subconference[], sources: DataSourceFormat[]): SourceData {
  const rpSources = sources.filter(s => s.format === 'rp') as RpDataSourceFormat[];

  const result: SourceData = {
    speakers: [],
    sessions: [],
    days,
    event,
    subconferences,
  };

  rpSources.forEach(source => {
    const speakersJSON = JSON.parse(readFileSync(source.speakersPath, "utf8"));
    result.speakers = result.speakers.concat(
      speakersFromJson(speakersJSON, {
        eventId: event.id,
        speakerLinkPrefix: source.speakerLinkBaseUrl,
        picturePrefix: source.speakerImageBaseUrl,
      })
    );

    const sessionsJSON = JSON.parse(readFileSync(source.sessionsPath, "utf8"));
    const [ firstLocation ] = event.locations
    result.sessions = result.sessions.concat(
      sessionsFromJson(sessionsJSON, {
        eventId: event.id,
        sessionLinkPrefix: source.speakerLinkBaseUrl,
        timezone: firstLocation.timezone,
      })
    );
  });
  return result;
}
