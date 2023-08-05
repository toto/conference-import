import { SourceData } from "./sourceData";
import * as ConferenceModel from "../models";
import { stateForSession, SessionState } from "../models/session";
import * as moment from "moment-timezone";
import axios from "axios";
import { fetchedPoisFromC3Nav } from "../dataSources/pois";

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

  /** Sets optional sources for POIs */
  poiSources?: [{
    kind: "c3nav", 
    url: string,
    poiToLocationId?: Record<string, string>
  }]

  /** If set all sessions whose duration is less in minutes will not be imported */
  minimumSessionDurationMinutes?: number;
  /** If set all sessions whose duration is more in minutes will not be imported */
  maximumSessionDurationMinutes?: number;
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
    // prefer original data track color
    let color = tracks.find(t => t.id == track.id)?.color
    if (!color) {
      // fall back to options.colorForTrack
      color = options.colorForTrack[track.id];
      if (options.colorForTrack && !color) {
        // fall back to options.defaultColor
        color = options.defaultColor;
      }
    }
    if (color) {
      result.color = color;
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

  let sourcedPois: ConferenceModel.POI[] = []
  if (options.poiSources) {
    for (const source of options.poiSources) {
      if (source.kind === "c3nav") {
        try {
          const pois = await fetchedPoisFromC3Nav(source.url, {
            eventId: event.id,
            poiToLocationId: source.poiToLocationId,
            locations: miniLocations,
          })
          sourcedPois = sourcedPois.concat(pois);  
        } catch (error) {
          console.error("Faild to fetch pois from", source.url, " Kind:", source.kind, error);  
        }
      } else {
        console.warn("Cannout add POIs from unknown source:", source.kind);
      }
    }
  }

  if (options.minimumSessionDurationMinutes) {
    resultSessions = resultSessions.filter(session => {
      if (session.begin && session.end) {
        const minuteDuration = (session.end.unix() - session.begin.unix()) / 60
        const isLongEnough = minuteDuration >= (options.minimumSessionDurationMinutes ?? 0)
        if (!isLongEnough) {
          console.warn(`Not importing session ${session.id} (${session.title}) because it's ${minuteDuration} minutes long. Limit is ${options.minimumSessionDurationMinutes}`)
        }
        return isLongEnough;
      } else {
        return true;
      }
    })
  }

  if (options.maximumSessionDurationMinutes) {
    resultSessions = resultSessions.filter(sessions => {
      if (sessions.begin && sessions.end) {
        const minuteDuration = (sessions.end.unix() - sessions.begin.unix()) / 60
        return minuteDuration <= (options.maximumSessionDurationMinutes ?? 1000000)
      } else {
        return true;
      }
    })
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
    pois: pois.concat(sourcedPois),
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
