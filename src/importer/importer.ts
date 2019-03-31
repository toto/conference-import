import { SourceData } from "./sourceData";
import * as ConferenceModel from "../models";
import { stateForSession, SessionState } from "../models/session";
import * as moment from "moment-timezone";

const ISO_DAY_FORMAT = "YYYY-MM-DD";

export type Color = [number, number, number, number];

export interface ConferenceData {
  event: ConferenceModel.Event;
  sessions: ConferenceModel.Session[];
  speakers: ConferenceModel.Speaker[];
  tracks: ConferenceModel.Track[];
  days: ConferenceModel.Day[];
  locations: ConferenceModel.Location[];
}

export interface Options {
  locationIdOrder: string[];
  colorForTrack: Map<String, Color>;
  defaultColor: Color;
  timezone: string;
  hourOfDayChange: number;
}

export function process(
  sourceData: SourceData,
  options: Options
): ConferenceData {
  const { sessions, speakers, event, days } = sourceData;

  // Extract tracks and process color
  const miniTrackMap = new Map<string, ConferenceModel.MiniTrack>();
  sessions.forEach(s => miniTrackMap.set(s.track.id, s.track));
  const miniTracks = Array.from(miniTrackMap.values());
  const tracks = miniTracks.map(track => {
    const result = track as ConferenceModel.Track;
    result.type = "track";
    const color = options.colorForTrack.get(track.id);
    if (color) {
      result.color = color;
    } else {
      result.color = options.defaultColor;
    }
    return result;
  });

  // Process sessions for days if scheduled
  const resultSessions = sessions.map(session => {
    const dateString = isoDayForSession(
      session,
      options.timezone,
      options.hourOfDayChange
    );

    session.day = days.find(
      d => d.date.tz(options.timezone).format(ISO_DAY_FORMAT) === dateString
    );

    return session;
  });

  // Extract locations from sessions
  const miniLocationMap = new Map<string, ConferenceModel.MiniLocation>();
  sessions.forEach(session => {
    const { location } = session;
    if (location) miniLocationMap.set(location.id, location);
  });
  const miniLocations = Array.from(miniLocationMap.values());
  const locations = miniLocations.map((miniLocation, index) => {
    const location = miniLocation as ConferenceModel.Location;
    location.type = "location";
    location.is_stage = false;
    let orderIndex = options.locationIdOrder.indexOf(location.id);
    if (!orderIndex) {
      orderIndex = index + miniLocations.length;
    }
    location.order_index = orderIndex;
    return location;
  });

  // 3. Process location order

  return { event, sessions: resultSessions, speakers, tracks, days, locations };
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
