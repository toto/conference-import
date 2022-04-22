import * as moment from 'moment-timezone';
import { Session } from './../../models/session';
import { Rp2APIElement } from '.';
import { dehtml, mkId } from '../util';
import { languageFromIsoCode } from '../rp/language';
import { MiniLocation, MiniSpeaker, MiniTrack, Subconference } from '../../models';


interface Options {
  sessionPostProcessing?(session: Session): Session | null
  eventId: string
  sessionUrlPrefix: string
  defaultTrack: MiniTrack,
  timezone: string
}

export function sessionFromApiSession(apiSession: Rp2APIElement, options: Options): Session | null {
  const {
    nid,
    title,
    teaser,
    description,
    langcode,
    room,
    room_nid,
    special,
    track,
    speaker,
    speaker_uid,
    moderator,
    moderator_uid,
    path,
  } = apiSession;

  if (!nid || typeof nid !== "string") return null;
  if (!title || typeof title !== "string") return null;
  if (!langcode || typeof langcode !== "string") return null; 
  const lang = languageFromIsoCode(langcode);
  if (!lang) return null;
  if (!path || typeof path !== "string") return null;

  let sessionTrack = options.defaultTrack
  if (track && typeof track === "string") {
    sessionTrack = {
      id: mkId(track),
      label_en: track,
      label_de: track,
    }
  }

  let location: MiniLocation | undefined
  if (typeof room === "string" && typeof room_nid === "string") {
    location = {
      id: room_nid,
      label_en: room,
      label_de: room,
    }
  }

  let subconference: Subconference | undefined
  if (typeof special === "string") {
    subconference = {
      type: "subconference",
      id: mkId(special),
      label: special,
      event: options.eventId,
    }
  }

  let begin: moment.Moment | undefined;
  let end: moment.Moment | undefined;
  let duration: number | undefined;
  if (typeof apiSession.datetime_start === "string" 
      && typeof apiSession.datetime_end === "string") {
    begin = moment.tz(apiSession.datetime_start, "YYYY-MM-DD'T'HH:mm:ss", options.timezone);
    end = moment.tz(apiSession.datetime_end, "YYYY-MM-DD'T'HH:mm:ss", options.timezone);
    duration = end.diff(begin, 'minute');
  }

  const speakers: MiniSpeaker[] = []
  if (Array.isArray(speaker) && Array.isArray(speaker_uid) && speaker.length === speaker_uid.length) {
    for (let index = 0; index < speaker.length; index++) {
      const id = speaker_uid[index] as unknown as string
      const name = speaker[index] as unknown as string
      speakers.push({ id, name });
    }
  }

  if (Array.isArray(moderator) && Array.isArray(moderator_uid) && moderator_uid.length === moderator.length) {
    const speakerIds = new Set(speakers.map(s => s.id))
    for (let index = 0; index < moderator.length; index++) {
      const id = moderator_uid[index] as unknown as string
      if (speakerIds.has(id)) continue;
      const name = moderator[index] as unknown as string
      speakers.push({ id, name });
    }
  }

  let session: Session | null = {
    id: nid,
    title,
    type: "session",
    event: options.eventId, 
    url: `${options.sessionUrlPrefix}${path}`,
    track: sessionTrack,
    lang, 
    location,
    speakers,
    enclosures: [],
    links: [],
    abstract: typeof teaser === "string" ? dehtml(teaser) : "", 
    description: typeof description === "string" ? dehtml(description) : "",
    cancelled: apiSession.status === "cancelled",
    begin,
    end,
    duration,
    subconference,
  };
  if (options.sessionPostProcessing && session) {
    session = options.sessionPostProcessing(session);
  }
  return session;
}
