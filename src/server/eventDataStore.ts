import * as fs from 'fs';
import { Event, Session, Speaker, Day, Track, Location, Subconference } from '../models';
import { ConferenceData } from '../importer/importer';



interface EventResources {
  sessions: Map<string,Session>
  speakers: Map<string,Speaker>
  days: Map<string,Day>
  tracks: Map<string,Track>
  locations: Map<string,Location>
  subconferences: Map<string,Subconference>
}

export class EventDataStore implements EventResources {
  event: Event
  sessions: Map<string,Session>
  speakers: Map<string,Speaker>
  days: Map<string,Day>
  tracks: Map<string,Track>
  locations: Map<string,Location>
  subconferences: Map<string,Subconference>

  constructor(conferenceData: ConferenceData) {
    this.event = conferenceData.event;
    this.sessions = new Map();
    this.speakers = new Map();
    this.days = new Map();
    this.tracks = new Map();
    this.locations = new Map();
    this.subconferences = new Map();
    this.updateResourceMaps(conferenceData);
  }

  private updateResourceMaps(data: ConferenceData) {
    data.sessions.forEach(s => this.sessions.set(s.id, s));
    data.speakers.forEach(s => this.speakers.set(s.id, s));
    data.days.forEach(s => this.days.set(s.id, s));
    data.tracks.forEach(s => this.tracks.set(s.id, s));
    data.locations.forEach(s => this.locations.set(s.id, s));
    data.subconferences.forEach(s => this.subconferences.set(s.id, s));
  }

  resourceForId(resource: keyof EventResources, id: string) {
    return this[resource].get(id);
  }

  resources(resource: keyof EventResources) {
    const map = this[resource];
    const resources = [...map].map(r => r[1]);
    return resources.sort((a,b) => a.id.localeCompare(b.id));
  }

  static eventDataFromFile(jsonFilePath: string): EventDataStore | null {
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8')) as ConferenceData;
    return new EventDataStore(data);
  }
}

