import { writeFileSync } from "fs";
import { Event, Day, Subconference } from "../models";
import { DataSourceFormat } from "../dataSources/dataSource";
import * as rp from "./../dataSources/rp";
import { processData, ConferenceData, Color } from './importer';

interface ConfigurationOptions {
  locationIdOrder: string[]
  defaultColor: Color
  colorForTrack: {[key: string]: Color}
  timezone: string
  hourOfDayChange: number
  nonStageLocationIds?: string[]
}

export interface Configuration {
  event: Event
  days: Day[]
  subconferences: Subconference[]
  sources: DataSourceFormat[]
  options: ConfigurationOptions
}

export async function dumpNormalizedConference(configuration: Configuration, destinationFile: string) {
  let { days, subconferences } = configuration;
  const { event, options, sources } = configuration;

  event.type = "event";
  days = days.map(day => {
    day.type = 'day';
    return day;
  });
  subconferences = subconferences.map(sc => {
    sc.type = 'subconference';
    return sc;
  });

  const result: ConferenceData = {
    event,
    days,
    subconferences,
    sessions: [],
    speakers: [],
    tracks: [],
    locations: [],
  };
  const rpdata = await rp.sourceData(event, days, subconferences, sources);
  rpdata.forEach(data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, tracks, locations } = processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
  });
  
  const string = JSON.stringify(result);
  writeFileSync(destinationFile, string, 'utf8');
}