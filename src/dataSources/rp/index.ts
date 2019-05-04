import * as axios from "axios";
import { SourceData } from "../../importer/sourceData";
import { Event, Day, Subconference, Track } from "../../models";
import { sessionsFromJson } from "./sessions";
import { speakersFromJson } from "./speakers";
import { DataSourceFormat } from "../dataSource";

export interface RpDataSourceFormat extends DataSourceFormat {
  format: "rp"
  speakersUrl: string;
  sessionLinkBaseUrl: string;
  sessionsUrl: string;
  speakerLinkBaseUrl: string;
  speakerImageBaseUrl: string;
  defaultTrack: Track;
  defaultLanguageName?: string;
  subconferenceId?: string;
  filterSpeakerNames?: string[]
  filterSessionNames?: string[],
  timezone?: string
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
    maps: []
  };

  const speakersJSON = await axios.default.get(source.speakersUrl);
  const sessionsJSON = await axios.default.get(source.sessionsUrl);

  result.speakers = result.speakers.concat(
    speakersFromJson(speakersJSON.data, {
      eventId: event.id,
      speakerLinkPrefix: source.speakerLinkBaseUrl,
      picturePrefix: source.speakerImageBaseUrl,
      filterSpeakerNames: source.filterSpeakerNames,
    })
  );

  const [ firstLocation ] = event.locations
  result.sessions = result.sessions.concat(
    sessionsFromJson(sessionsJSON.data, {
      eventId: event.id,
      sessionLinkPrefix: source.sessionLinkBaseUrl,
      timezone: source.timezone ? source.timezone : firstLocation.timezone,
      defaultTrack: source.defaultTrack,
      defaultLanguageName: source.defaultLanguageName,
      subconferenceFinder: (session, rawSession) => {
        let subconference: Subconference | undefined;
        const { subconferenceId } = source;
        if (subconferenceId) {
          subconference = subconferences.find(s => s.id === subconferenceId);
        }
        
        const { conference } = rawSession;
        if (!subconference && conference && typeof conference === 'string') {
          subconference = subconferences.find(s => conference.toLowerCase().includes(s.label.toLowerCase()))
        }

        const { topic } = rawSession;
        if (!subconference && topic && typeof topic === 'string') {
          subconference = subconferences.find(s => topic.toLowerCase().includes(s.label.toLowerCase()))
        }

        return subconference;
      },
      filterSpeakerNames: source.filterSpeakerNames,
      filterSessionNames: source.filterSessionNames,
    })
  );

  return result;
}

export async function sourceData(event: Event, days: Day[], subconferences: Subconference[], sources: DataSourceFormat[]) {
  const rpSources = sources.filter(s => s.format === 'rp') as RpDataSourceFormat[];
  
  const promises = rpSources.map(source => singleSourceData(event, days, subconferences, source));
  return Promise.all(promises);
}
