import { Session, Link } from "../models";

enum LiveStreamKind {
  youtube = "youtube"
}

export interface LiveStream {
  kind: LiveStreamKind
  location: string
  url: string
  day?: string
}

export function enclosureOrLinkFrom(stream: LiveStream, session: Session): Link | null {
  if (!session.location) return null;
  if (session.location.id !== stream.location) return null;
  if (stream.day && session.day && session.day.id !== stream.day) {
    return null;
  }
  
  if (stream.kind === LiveStreamKind.youtube) {
    return {
      url: stream.url,
      type: "livestream",
      service: "youtube",
      title: session.title
    }
  }
  
  return null;
}