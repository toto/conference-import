import * as fs from 'fs';
import * as moment from 'moment-timezone';

import * as ConferenceModel from '../models';
import { ConferenceData } from '../importer/importer';
import { makeConferenceLive } from './live-data-fake';

export const resourceNames = [
  "sessions",
  "speakers",
  "days",
  "tracks",
  "locations",
  "subconferences",
  "maps",
  "pois",
] as const;
export type ResourceName = typeof resourceNames[number];

interface ResourceTypes {
  sessions: ConferenceModel.Session;
  speakers: ConferenceModel.Speaker;
  days: ConferenceModel.Day;
  tracks: ConferenceModel.Track;
  locations: ConferenceModel.Location;
  subconferences: ConferenceModel.Subconference;
  maps: ConferenceModel.Map;
  pois: ConferenceModel.POI;
}

type ResourceCollections = { [K in ResourceName]: Map<string, ResourceTypes[K]> };

export class EventDataStore {
  event: ConferenceModel.Event;
  readonly byType: ResourceCollections;
  updatedAt: Date;
  sourcePath?: string;

  constructor(conferenceData: ConferenceData, fakeLiveDate?: moment.Moment, updatedAt: Date = new Date(), sourcePath?: string) {
    const data = fakeLiveDate ? makeConferenceLive(fakeLiveDate, conferenceData) : conferenceData;
    this.event = data.event;
    this.updatedAt = updatedAt;
    this.sourcePath = sourcePath;
    this.byType = {
      sessions: new Map(),
      speakers: new Map(),
      days: new Map(),
      tracks: new Map(),
      locations: new Map(),
      subconferences: new Map(),
      maps: new Map(),
      pois: new Map(),
    };
    this.populate(data);
  }

  get sessions() { return this.byType.sessions; }
  get speakers() { return this.byType.speakers; }
  get days() { return this.byType.days; }
  get tracks() { return this.byType.tracks; }
  get locations() { return this.byType.locations; }
  get subconferences() { return this.byType.subconferences; }
  get maps() { return this.byType.maps; }
  get pois() { return this.byType.pois; }

  private populate(data: ConferenceData) {
    data.sessions.forEach(s => this.byType.sessions.set(s.id, s));
    data.speakers.forEach(s => this.byType.speakers.set(s.id, s));
    data.days.forEach(s => this.byType.days.set(s.id, s));
    data.tracks.forEach(s => this.byType.tracks.set(s.id, s));
    data.locations.forEach(s => this.byType.locations.set(s.id, s));
    data.subconferences.forEach(s => this.byType.subconferences.set(s.id, s));
    if (data.maps) data.maps.forEach(s => this.byType.maps.set(s.id, s));
    if (data.pois) data.pois.forEach(s => this.byType.pois.set(s.id, s));
  }

  resourceForId<K extends ResourceName>(resource: K, id: string): ResourceTypes[K] | undefined {
    const map = this.byType[resource] as Map<string, ResourceTypes[K]>;
    return map.get(id);
  }

  resources<K extends ResourceName>(resource: K): ResourceTypes[K][] {
    const map = this.byType[resource] as Map<string, ResourceTypes[K]>;
    return Array.from(map.values());
  }

  static eventDataFromFile(jsonFilePath: string, fakeLiveDate?: moment.Moment): EventDataStore {
    let raw: string;
    try {
      raw = fs.readFileSync(jsonFilePath, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read event data file '${jsonFilePath}': ${(err as Error).message}`);
    }
    let data: ConferenceData;
    try {
      data = JSON.parse(raw) as ConferenceData;
    } catch (err) {
      throw new Error(`Failed to parse event data file '${jsonFilePath}': ${(err as Error).message}`);
    }
    const updatedAt = fs.statSync(jsonFilePath).mtime;
    return new EventDataStore(data, fakeLiveDate, updatedAt, jsonFilePath);
  }
}
