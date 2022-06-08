import { SourceData } from "./sourceData";
import * as ConferenceModel from "../models";
import { stateForSession, SessionState } from "../models/session";
import * as moment from "moment-timezone";
import axios from "axios";

const ISO_DAY_FORMAT = "YYYY-MM-DD";

export type Color = [number, number, number, number];

export interface ConferenceData {
  event: ConferenceModel.Event;
  sessions: ConferenceModel.Session[];
  speakers: ConferenceModel.Speaker[];
  tracks: ConferenceModel.Track[];
  days: ConferenceModel.Day[];
  locations: ConferenceModel.Location[];
  subconferences: ConferenceModel.Subconference[];
  maps?: ConferenceModel.Map[];
  pois?: ConferenceModel.POI[];
}

export interface Options {
  locationIdOrder: string[];
  colorForTrack: Record<string, Color>;
  defaultColor: Color;
  timezone: string;
  hourOfDayChange: number;
  nonStageLocationIds?: string[];
  /** Maps location ids exclusivly to subconference Ids. 
   * 
   *  All sessions at a location will be assigned this subconference
   *  if it exists and no subconference is present in the
   *  session for any other reason. */
  subconferenceLocationIds?: Record<string, string>;
  /** Url to a JSON source for mapping session ids to their recommended sessions.
   * Format looks like this: `{"session-1": ["session-2", "session-3"]}`
   */
  recommendationsSource?: string;
}

/**
 * Extracts data like tacks and locations from SourceData
 * @param sourceData 
 * @param options 
 */
export async function processData(
  sourceData: SourceData,
  options: Options
): Promise<ConferenceData> {
  const { sessions, speakers, event, days, subconferences, maps, pois } = sourceData;

  // The source data allows the importer to optionally pass tracks
  const tracks: ConferenceModel.Track[] = sourceData.tracks ?? [];
  // Extract tracks and process color
  const miniTrackMap = new Map<string, ConferenceModel.MiniTrack>();
  sessions.forEach(s => miniTrackMap.set(s.track.id, s.track));
  const miniTracks = Array.from(miniTrackMap.values());
  miniTracks.forEach(track => {
    const result = track as ConferenceModel.Track;
    result.type = "track";
    const color = options.colorForTrack[track.id];
    if (color) {
      result.color = color;
    } else {
      result.color = options.defaultColor;
    }
    // If the tracks are provided already don't duplicate them
    if (!tracks.map(t => t.id).includes(result.id)) {
      tracks.push(result)
    }
  });

  // Process sessions for days if scheduled
  let resultSessions = sessions.map(session => {
    const dateString = isoDayForSession(
      session,
      options.timezone,
      options.hourOfDayChange
    );

    session.day = days.find(
      d => d.date === dateString
    );

    return session;
  });

  // Assign subconferences by location mapping if present
  if (options.subconferenceLocationIds) {
    resultSessions = sessions.map(session => {
      // don't overwrite existing subconferences
      if (session.subconference) return session;

      const locationId = session.location?.id;
      if (!locationId) return session;
      const idmap = options.subconferenceLocationIds;
      if (!idmap) return session;
      const subconferenceId = idmap[locationId];
      if (!subconferenceId) return session;
      const subconference = subconferences.find(s => s.id === subconferenceId)
      if (!subconference) return session;

      session.subconference = subconference;

      return session;
    });
  }

  // Extract locations from sessions and process them with order
  const miniLocationMap = new Map<string, ConferenceModel.MiniLocation>();
  sessions.forEach(session => {
    const { location } = session;
    if (location) miniLocationMap.set(location.id, location);
  });
  const miniLocations = Array.from(miniLocationMap.values());
  const locations = miniLocations.map((miniLocation, index) => {
    const location = miniLocation as ConferenceModel.Location;
    location.type = "location";
    
    const { nonStageLocationIds } = options;
    if (nonStageLocationIds) {
      location.is_stage = !nonStageLocationIds.includes(location.id);
    } else {
      location.is_stage = true;
    }
    let orderIndex = options.locationIdOrder.indexOf(location.id);
    if (orderIndex === -1) {
      console.warn(`Warning: Location ${location.label_en} (${location.id}) has no order index.`);
      orderIndex = index + miniLocations.length;
    }
    location.order_index = orderIndex;
    return location;
  });

  // // Process cross relationships - sessions from speaker
  // const speakerMap = new Map<string,ConferenceModel.Speaker>();
  // speakers.forEach(s => speakerMap.set(s.id, s));
  const sessionMap = new Map<string,ConferenceModel.Session>();
  resultSessions.forEach(s => sessionMap.set(s.id, s));

  // Try to load reccomended sessions if present
  if (options.recommendationsSource) {
    try {
      const response = await axios.get(options.recommendationsSource)
      const recommendations = response.data as Record<string, string[]>;
      if (recommendations) {
        resultSessions.forEach(session => {
          const recomendationsForSession = recommendations[session.id];
          if (recomendationsForSession) {
            const recommendedMiniSessions = recomendationsForSession
              .map(id => sessionMap.get(id))
              .filter(s => s !== undefined)
              .filter(s => s?.begin && s?.location) // only allow scheduled sessions
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              .map(s => {return {id: s!.id, title: s!.title} as ConferenceModel.MiniSession})
              .slice(0, 5) // limit to 5
            session.related_sessions = recommendedMiniSessions
          }
        })
      }
    } catch (e) {
      console.error(`Could not load recommendations from ${options.recommendationsSource}. Not adding recomendations.`)
    }
  }

  return { 
    event,
    sessions: resultSessions,
    speakers,
    tracks,
    days,
    locations,
    subconferences,
    maps,
    pois,
  };
}

export function isoDayForSession(
  session: ConferenceModel.Session,
  timezone: string,
  hourOfDayChange: number
): string | undefined {
  const begin = session.begin;
  if (
    begin === undefined ||
    stateForSession(session) !== SessionState.SCHEDULED
  ) {
    return undefined;
  }

  const localBegin = moment(begin.tz(timezone));
  const hour = localBegin.get("h");

  if (hour < hourOfDayChange) {
    localBegin.subtract(1, "d");
  }

  return localBegin.format(ISO_DAY_FORMAT);
}
