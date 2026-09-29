import { writeFileSync } from "fs";
import { Event, Day, Subconference } from "../models";
import { DataSourceFormat } from "../dataSources/dataSource";
import * as rp from "./../dataSources/rp";
import * as rp2 from "./../dataSources/rp2";
import * as ocdata from "./../dataSources/ocdata";
import * as pretalx from "./../dataSources/pretalx";
import * as frab from "./../dataSources/frab";
import * as halfnarp from "./../dataSources/halfnarp";
import * as c3hub from "./../dataSources/c3hub";
import * as scheduleJSON from "./../dataSources/scheduleJSON";
import { processData, ConferenceData, Color } from './importer';
import { linkFrom, LiveStream, enclosureFrom } from "../dataSources/stream";
import { MapConfiguration } from "../models/map";
import { addMapNavigationLinks, mergeMaps } from "./maps";
import { isScheduleJSONDataSourceFormat } from "../dataSources/scheduleJSON/dataFormat";

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
  livestreams?: LiveStream[]
  maps?: MapConfiguration[]
}

export async function dumpNormalizedConference(configuration: Configuration, destinationFile: string) {
  let { days, subconferences } = configuration;
  const { event, options } = configuration;
  const eventMaps = mergeMaps(configuration.maps ?? [], event.id);
  let { sources } = configuration;
  // Ignore all disabled sources
  sources = sources.filter(s => !(s.disabled ?? false))
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
    maps: eventMaps,
    pois: [],
  };
  const rpdata = await rp.sourceData(event, days, subconferences, sources);
  await asyncForEach(rpdata, async data  => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, tracks, locations, maps, pois } = await processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    result.subconferences = result.subconferences.filter(s => !subconferences.map(subconference => subconference.id).includes(s.id));
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });
  const rp2data = await rp2.sourceData(event, days, subconferences, sources);
  await asyncForEach(rp2data, async data => {
    // if (data.sessions.length === 0) return;
    const { sessions, speakers, tracks, locations, maps, pois, subconferences } = await processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    result.subconferences = result.subconferences.concat(subconferences);
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });  
  const oc = await ocdata.sourceData(event, sources);
  await asyncForEach(oc, async data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, tracks, locations, maps, pois } = data;
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    // result.days = data.days.filter(d => !days.map(day => day.id).includes(d.id));
    result.subconferences = data.subconferences.filter(s => !subconferences.map(subconference => subconference.id).includes(s.id));
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });
  const pretalxData = await pretalx.sourceData(event, days, subconferences, sources);
  await asyncForEach(pretalxData, async data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, maps, tracks, locations, pois } = await processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    // result.days = data.days.filter(d => !days.map(day => day.id).includes(d.id));
    result.subconferences = data.subconferences.filter(s => !subconferences.map(subconference => subconference.id).includes(s.id));
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });
  const frabData = await frab.sourceData(event, days, subconferences, sources);
  await asyncForEach(frabData, async data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, maps, tracks, locations, pois } = await processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    // result.days = data.days.filter(d => !days.map(day => day.id).includes(d.id));
    result.subconferences = data.subconferences.filter(s => !subconferences.map(subconference => subconference.id).includes(s.id));
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });

  const halfnarpData = await halfnarp.sourceData(event, days, subconferences, sources);
  await asyncForEach(halfnarpData, async data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, maps, tracks, locations, pois } = await processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    // result.days = data.days.filter(d => !days.map(day => day.id).includes(d.id));
    result.subconferences = data.subconferences.filter(s => !subconferences.map(subconference => subconference.id).includes(s.id));
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });

  const c3HubData = await c3hub.sourceData(event, days, subconferences, sources);
  await asyncForEach(c3HubData, async data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, maps, tracks, locations, pois } = await processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    // result.days = data.days.filter(d => !days.map(day => day.id).includes(d.id));
    result.subconferences = (result.subconferences ?? []).concat(data.subconferences ?? [])
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });

  // Event-level navigation takes precedence; keep legacy mappings for other rooms.
  const mappedLocations = new Set(eventMaps.flatMap(map => map.provider === "c3nav"
    ? Object.keys(map.c3nav.location_id_to_slug ?? {}) : []));
  const scheduleSources = sources.map(source => {
    if (!isScheduleJSONDataSourceFormat(source) || !source.c3nav) return source;
    const locationIdToNavSlug = Object.fromEntries(Object.entries(source.c3nav.locationIdToNavSlug)
      .filter(([id]) => !mappedLocations.has(id)));
    return { ...source, c3nav: { ...source.c3nav, locationIdToNavSlug } };
  });
  const scheduleJSONData = await scheduleJSON.sourceData(event, days, subconferences, scheduleSources);
  await asyncForEach(scheduleJSONData, async data => {
    if (data.sessions.length === 0) return;
    const { sessions, speakers, maps, tracks, locations, pois, subconferences } = await processData(data, options);
    result.sessions = result.sessions.concat(sessions);
    result.speakers = result.speakers.concat(speakers);
    result.tracks = result.tracks.concat(tracks);
    result.locations = result.locations.concat(locations);
    // result.days = data.days.filter(d => !days.map(day => day.id).includes(d.id));
    result.subconferences = (result.subconferences ?? []).concat(subconferences ?? [])
    if (maps) result.maps = (result.maps ?? []).concat(maps);
    if (result.pois && pois) result.pois = result.pois.concat(pois);
  });  

  result.sessions.forEach(s => s.event = event.id);
  result.sessions.forEach(session => {
    if (configuration.livestreams) {
      const streamLink = configuration.livestreams
        .map(ls => linkFrom(ls, session))
        .find(l => l !== null);
      if (streamLink) {
        session.links.push(streamLink);
      }

      const streamEnclosure = configuration.livestreams
        .map(ls => enclosureFrom(ls, session))
        .find(l => l !== null);
      if (streamEnclosure) {
        session.enclosures.push(streamEnclosure);
      }
    }
  });
  result.speakers.forEach(s => s.event = event.id);
  result.tracks.forEach(s => s.event = event.id);
  result.days.forEach(s => s.event = event.id);
  result.locations.forEach(s => s.event = event.id);
  result.subconferences.forEach(s => s.event = event.id);
  result.maps = mergeMaps(result.maps ?? [], event.id);
  addMapNavigationLinks(result.sessions, result.maps);
  if (result.pois) result.pois.forEach(s => s.event = event.id);

  const string = JSON.stringify(result, undefined, 2);
  writeFileSync(destinationFile, string, 'utf8');
}

async function asyncForEach<T>(array: T[], callback: (item: T, index: number, array: T[]) => Promise<void>) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
