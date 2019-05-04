import { writeFileSync } from "fs";
import { Event, Day, Subconference } from "../models";
import { DataSourceFormat } from "../dataSources/dataSource";
import * as rp from "./../dataSources/rp";
import * as ocdata from "./../dataSources/ocdata";
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
    maps: [],
  };
  const rpdata = await rp.sourceData(event, days, subconferences, sources);
  rpdata.forEach(data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, tracks, locations, maps } = processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    result.maps = result.maps.concat(maps);
    result.subconferences = result.subconferences.filter(s => !subconferences.map(subconference => subconference.id).includes(s.id));
  });
  const oc = await ocdata.sourceData(event, sources);
  oc.forEach(data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, tracks, locations, maps } = data;
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    result.days = data.days.filter(d => !days.map(day => day.id).includes(d.id));
    result.subconferences = data.subconferences.filter(s => !subconferences.map(subconference => subconference.id).includes(s.id));
    result.maps = result.maps.concat(maps);
  });
 
  result.sessions.forEach(s => s.event = event.id);
  result.speakers.forEach(s => s.event = event.id);
  result.tracks.forEach(s => s.event = event.id);
  result.days.forEach(s => s.event = event.id);
  result.locations.forEach(s => s.event = event.id);
  result.subconferences.forEach(s => s.event = event.id);
  result.maps.forEach(s => s.event = event.id);

  const string = JSON.stringify(result);
  writeFileSync(destinationFile, string, 'utf8');
}