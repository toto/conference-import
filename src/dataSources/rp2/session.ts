import * as moment from 'moment-timezone';
import { Session } from './../../models/session';
import { Rp2APIElement } from '.';
import { dehtml, mkId } from '../util';
import { languageFromIsoCode } from '../rp/language';
import { Link, MiniLocation, MiniSpeaker, MiniTrack, Subconference } from '../../models';
import { htmlListAndParagraphToString, normalizedTrackId } from './util';
import { German } from '../rp/language';
import { English } from '../rp/language';
// import { normalizedTrackId } from './util';


interface Options {
  sessionPostProcessing?(session: Session): Session | null
  eventId: string
  sessionUrlPrefix: string
  defaultTrack: MiniTrack
  timezone: string
  trackMappings: Record<string, Array<string>>
  locationsToYouTubeLiveStream?: Record<string, string>
  /** Links mapping the DE and EN title to a link object */
  partnerLinks: Record<string, Link>
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
    language_id,
    moderator,
    moderator_uid,
    path,
    partner
  } = apiSession;

  if (!nid || typeof nid !== "string") return null;
  if (!title || typeof title !== "string") return null;
  if (!langcode || typeof langcode !== "string") return null; 
  if (langcode !== "en") return null;
  let lang = languageFromIsoCode(langcode);
  if (language_id) {
    if (language_id === "4") {
      lang = German;
    }
    if (language_id === "5") {
      lang = English;
    }
  }
  if (!lang) return null;
  if (!path || typeof path !== "string") return null;
  const partnerNames: string[] = []
  if (Array.isArray(partner)) {
    for (const partnerName of partner) {
      if (typeof partnerName === "string") {
        partnerNames.push(partnerName)
      }
    }
  }

  let sessionTrack = options.defaultTrack
  if (track && typeof track === "string") {
    const trackId = normalizedTrackId(track.toLowerCase(), options.trackMappings)
    sessionTrack = {
      id: trackId,
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
    begin = moment.utc(apiSession.datetime_start, "YYYY-MM-DD'T'HH:mm:ss");
    end = moment.utc(apiSession.datetime_end, "YYYY-MM-DD'T'HH:mm:ss");
    duration = end.diff(begin, 'minute');
  }

  const speakers: MiniSpeaker[] = []
  if (Array.isArray(speaker) && Array.isArray(speaker_uid) && speaker.length === speaker_uid.length) {
    for (let index = 0; index < speaker.length; index++) {
      const id = speaker_uid[index] as unknown as string
      const name = speaker[index] as unknown as string
      if (name.trim() !== "") {
        speakers.push({ id, name });
      }
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

  const links: Link[] = [];
  if (options.locationsToYouTubeLiveStream 
    && location?.id
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    && options.locationsToYouTubeLiveStream[location!.id]) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const url = options.locationsToYouTubeLiveStream[location!.id];
      links.push({
        url,
        type: "livestream",
        title,
        service: "youtube",
      });
  }

  for (const partnerName of partnerNames) {
    const partnerLink = options.partnerLinks[partnerName]
    if (partnerLink) {
      if (partnerLink.url.match(/youtube.com\/v\/(\w+)$/i)) {
        partnerLink.service = "youtube"
      }
      links.push(partnerLink)
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
    links,
    abstract: typeof teaser === "string" ? dehtml(teaser) : "", 
    description: typeof description === "string" ? htmlListAndParagraphToString(description) : "",
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
