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

interface Configuration {
  event: Event
  days: Day[]
  subconferences: Subconference[]
  sources: DataSourceFormat[]
  options: ConfigurationOptions
}

export async function dumpNormalizedConference(configuration: Configuration, destinationFile: string) {
  const { event, days, subconferences, sources } = configuration;
  const { options } = configuration;

  // const result: ConferenceData = {
  //   event,
  //   days,
  //   subconferences,
  //   sessions: [],
  //   speakers: [],
  //   tracks: [],
  //   locations: [],
  // };
  const rpdata = rp.sourceData(event, days, subconferences, sources);
  if (rpdata.sessions.length > 0) {
    const processedData = processData(rpdata, options);
    const string = JSON.stringify(processedData);
    writeFileSync(destinationFile, string, 'utf8');
  }
}