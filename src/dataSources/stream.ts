import { Session, Link, Enclosure } from "../models";

enum LiveStreamKind {
  youtube = "youtube",
  hls = "hls"
}

export interface LiveStream {
  kind: LiveStreamKind
  location: string
  url: string
  day?: string
  thumbnail?: string
}

export function enclosureFrom(stream: LiveStream, session: Session): Enclosure | null {
  if (!session.location) return null;
  if (session.location.id !== stream.location) return null;
  if (stream.day && session.day && session.day.id !== stream.day) {
    return null;
  }

  if (stream.kind === LiveStreamKind.hls) {
    return {
      url: stream.url,
      type: "livestream",
      mimetype: "application/x-mpegurl",
      title: session.title,
      thumbnail: stream.thumbnail,
    }
  }

  return null;
}

export function linkFrom(stream: LiveStream, session: Session): Link | null {
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