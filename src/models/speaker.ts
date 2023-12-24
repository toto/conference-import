import { TextFormat } from './basic';
import { Link } from './link';
import { MiniSession } from './session';

export interface MiniSpeaker {
  id: string
  name: string
}

export interface Speaker extends MiniSpeaker {
  type: string
  event: string
  photo?: string
  url: string | null
  organization?: string
  position?: string
  biography?: string
  biography_format?: TextFormat
  links: Link[]
  sessions: MiniSession[]
}