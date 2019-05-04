import * as ConferenceModel from "../models";

export interface SourceData {
  event: ConferenceModel.Event
  sessions: ConferenceModel.Session[]
  speakers: ConferenceModel.Speaker[]
  days: ConferenceModel.Day[]
  subconferences: ConferenceModel.Subconference[]
  maps: ConferenceModel.Map[]
}