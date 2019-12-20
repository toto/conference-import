import * as moment from 'moment-timezone';
import { Session, MiniLocation, MiniTrack, Language, MiniSpeaker, Speaker } from "../../models";
import { languageFromIsoCode } from './../rp/language';
import { PretalxDataSourceFormat } from './dataFormat';
import { mkId, dehtml } from '../rp/utils';

function locationFromTalk(talk: any, prefix: string): MiniLocation | undefined {
  if (talk && talk.slot && talk.slot.room) {
    let roomName = talk.slot.room;
    if (typeof roomName === 'object') {
      // sometimes room names are localized, we hardcode to the en name for now
      if (roomName['en']) {
        roomName = roomName['en'];
      } else if (roomName['de']) {
        roomName = roomName['de'];
      }
    }    
    return {
      id: mkId(`${prefix}-${roomName}`),
      label_de: roomName,
      label_en: roomName,
    }
  }
  return undefined;
}

function talksToSession(talk: any, config: PretalxDataSourceFormat): Session | undefined {
  const speakers = talk.speakers.map((speaker: any) => {
    return {
      id: mkId(`${config.conferenceCode}-${speaker.code}`),
      name: speaker.name,
    };
  });

  const { start, end } = talk.slot;
  const beginDate = moment(start);
  const endDate = moment(end);
  const minutes = beginDate.diff(endDate, 'm');
  if (Math.abs(minutes) > 6 * 60) {
    return undefined;
  }

  const room = locationFromTalk(talk, config.conferenceCode);
  let track: MiniTrack = config.defaultTrack;
  if (talk.track) {
    let trackNameEn = talk.track;
    let trackNameDe = trackNameEn;
    if (talk.track['en']) {
      trackNameEn = talk.track.en;
      trackNameDe = trackNameEn;
    }
    if (talk.track['de']) {
      trackNameDe = talk.track.de;
    }
    track = {
      id: mkId(`${config.conferenceCode}-${trackNameEn}`),
      label_en: trackNameEn,
      label_de: trackNameDe,
    };
  }
  
  let language: Language = languageFromIsoCode(config.defaultLanguageCode)!;
  const parsedLang = languageFromIsoCode(talk.content_locale);
  if (parsedLang) language = parsedLang;

  let id: string = mkId(`${config.conferenceCode}-${talk.code}`);
  if (config.subconferenceId && config.useSubconferenceIdInSessionId === true) {
    id = mkId(`${config.conferenceCode}-${config.subconferenceId}-${talk.code}`);
  }

  const session: Session = {
    event: config.eventId,
    type: 'session',
    id,
    title: talk.title,
    subtitle: undefined,
    abstract: talk.abstract,
    description: talk.description,
    cancelled: false,
    will_be_recorded: talk.do_not_record ? false : undefined,
    track: track,
    lang: language,
    speakers: speakers.filter((s: MiniSpeaker) => s.name.length > 0),
    enclosures: [],
    links: [],
    url: `${config.baseUrl}${config.baseUrl.endsWith('/') ? '' : '/'}${config.conferenceCode}/talk/${talk.code}`,
    begin: beginDate,
    end: endDate,
    location: room,
  };
  return session;
}

function pretalxSpeakerToSpeaker(speaker: any, config: PretalxDataSourceFormat): Speaker | undefined {
  const result: Speaker = {
    event: config.eventId,
    type: 'session',
    id: mkId(`${config.conferenceCode}-${speaker.code}`),
    name: speaker.name,
    photo: speaker.avatar || undefined,
    organization: undefined,
    position: undefined,
    links: [],
    sessions: [],
    url: `${config.baseUrl}/${config.conferenceCode}/speaker/${speaker.code}`,
    biography: dehtml(speaker.biography),
  };

  return result;
}

export function sessionsFromJson(json: any[], config: PretalxDataSourceFormat): Session[] {
  return json.map((r: any) => talksToSession(r, config)).filter((s: Session | undefined) => s !== undefined) as Session[];
}

export function speakersFromJson(json: any[], config: PretalxDataSourceFormat): Speaker[] {
  return json.map((r: any) => pretalxSpeakerToSpeaker(r, config)).filter((s: Speaker | undefined) => s !== undefined) as Speaker[];
}
