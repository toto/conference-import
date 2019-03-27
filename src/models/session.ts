import * as moment from 'moment-timezone';
import { Subconference, Day, Level, Format, Language } from "./basic";
import { MiniLocation } from './location';
import { MiniTrack } from './track';
import { MiniSpeaker } from './speaker';
import { Enclosure } from './enclosure';
import { Link } from './link';

export interface MiniSession {
  id: string
  title: string
}

export interface Session extends MiniSession {
  subconference?: Subconference;
  subtitle?: string
  abstract: string
  description: string
  url: string
  begin?: moment.Moment
  end?: moment.Moment
  duration?: number
  day?: Day
  location?: MiniLocation
  track: MiniTrack
  format: Format
  level: Level 
  lang: Language
  translated_langs?: Language[]
  speakers: MiniSpeaker[]
  will_be_recorded?: boolean
  cancelled?: boolean
  enclosures: Enclosure[]
  links: Link[]
  related_sessions?: MiniSession[]
}