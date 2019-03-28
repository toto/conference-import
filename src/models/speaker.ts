import { Link } from './link';
import { MiniSession } from './session';

export interface MiniSpeaker {
  id: string
  name: string
}

export interface Speaker extends MiniSpeaker {
  type: string
  event: string
  photo: string
  url: string
  organization: string
  position: string
  biography: string
  links: Link[]
  sessions: MiniSession[]
}