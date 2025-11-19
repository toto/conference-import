import { Session, Speaker, Track } from "../../models";

export interface PretalxV1SessionConfig {
  format: "pretalx_v1"
  baseUrl: string
  eventId: string
  conferenceCode: string
  defaultLanguageCode: string
  filterSessionNames?: string[]
  defaultTrack: Track
  timezone?: string
  subconferenceId?: string
  baseSpeakerIdOnName?: boolean
  useSubconferenceIdInLocations?: boolean
  useSubconferenceIdInSessionId?: boolean
  recordedLocationIds?: string[];
}

export function sessionsFromJson(json: any[], config: PretalxV1SessionConfig): Session[] {
  return []
}

export function speakersFromJson(json: any[], config: PretalxV1SessionConfig): Speaker[] {
  return []
}