import * as fs from 'fs';
import * as moment from 'moment-timezone';

import * as ConferenceModel from '../models';
import { ConferenceData } from '../importer/importer';
import { makeConferenceLive } from './live-data-fake';

interface EventResources {
  sessions: Map<string,ConferenceModel.Session>
  speakers: Map<string,ConferenceModel.Speaker>
  days: Map<string,ConferenceModel.Day>
  tracks: Map<string,ConferenceModel.Track>
  locations: Map<string,ConferenceModel.Location>
  subconferences: Map<string,ConferenceModel.Subconference>
  maps: Map<string,ConferenceModel.Map>
  pois: Map<string,ConferenceModel.POI>
}

export class EventDataStore implements EventResources {
  event: ConferenceModel.Event
  sessions: Map<string,ConferenceModel.Session>
  speakers: Map<string,ConferenceModel.Speaker>
  days: Map<string,ConferenceModel.Day>
  tracks: Map<string,ConferenceModel.Track>
  locations: Map<string,ConferenceModel.Location>
  subconferences: Map<string,ConferenceModel.Subconference>
  maps: Map<string,ConferenceModel.Map>
  pois: Map<string,ConferenceModel.POI>

  constructor(conferenceData: ConferenceData, liveDebug = false) {
    let data = conferenceData;
    if (liveDebug) {
      data = makeConferenceLive(moment(), data);
    }
    this.event = data.event;
    this.sessions = new Map();
    this.speakers = new Map();
    this.days = new Map();
    this.tracks = new Map();
    this.locations = new Map();
    this.subconferences = new Map();
    this.maps = new Map();
    this.pois = new Map();
    this.updateResourceMaps(data);
  }

  private updateResourceMaps(data: ConferenceData) {
    data.sessions.forEach(s => this.sessions.set(s.id, s));
    data.speakers.forEach(s => this.speakers.set(s.id, s));
    data.days.forEach(s => this.days.set(s.id, s));
    data.tracks.forEach(s => this.tracks.set(s.id, s));
    data.locations.forEach(s => this.locations.set(s.id, s));
    data.subconferences.forEach(s => this.subconferences.set(s.id, s));
    if (data.maps) {
      data.maps.forEach(s => this.maps.set(s.id, s));
    }
    if (data.pois) {
      data.pois.forEach(s => this.pois.set(s.id, s));
    }
  }

  resourceForId(resource: keyof EventResources, id: string) {
    return this[resource].get(id);
  }

  resources(resource: keyof EventResources) {
    const map = this[resource];
    const resources = [...map].map(r => r[1]);
    return resources.sort((a,b) => a.id.localeCompare(b.id));
  }

  static eventDataFromFile(jsonFilePath: string, liveDebug: boolean = false): EventDataStore | null {
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8')) as ConferenceData;    
    return new EventDataStore(data, liveDebug);
  }
}

