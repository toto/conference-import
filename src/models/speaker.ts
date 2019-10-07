import { Link } from './link';
import { MiniSession } from './session';

export interface MiniSpeaker {
  id: string
  name: string
}

export interface Speaker extends MiniSpeaker {
  type: string
  event: string
  photo: string | undefined
  url: string
  organization: string | undefined
  position: string | undefined
  biography: string | undefined
  links: Link[]
  sessions: MiniSession[]
}