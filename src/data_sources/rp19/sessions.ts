import * as utils from './utils';
import { MiniTrack, Session, Subconference, MiniSpeaker } from '../../models';
import { languageFromString } from './language';


interface Options {
  sessionPostProcessing?(session: Session): Session | null
  eventId: string
  sessionLinkPrefix: string
  subconference?: Subconference
}

export function sessionsFromJson(json: any, options: Options): Session[] {
  if (!Array.isArray(json)) return [];

  const sessions: (Session | null)[] = json.map((item) => {
    const name = utils.nameAndUrlFromHtmlLink(item.title) || { url: '' };
    
    const track: MiniTrack = {
      id: utils.mkId(utils.dehtml(item.track)),
      label_en: utils.dehtml(item.track),
      label_de: utils.dehtml(item.track),
    }

    const lang = languageFromString(item.language);
    if (!lang) return null;

    const speakers: MiniSpeaker[] = [];

    utils.nameIdPairsFromCommaString(item.moderator, item.moderator_uid)
      .forEach(s => speakers.push(s));
    utils.nameIdPairsFromCommaString(item.speaker, item.speaker_uid)
      .forEach(s => speakers.push(s));

    return {
      type: "session",
      id: item.nid,
      subconference: options.subconference,
      title: utils.dehtml(item.title_text),
      subtitle: undefined,
      abstract: utils.dehtml(item.short_thesis),
      event: options.eventId,
      url: `${options.sessionLinkPrefix}${name.url}`,
      track,
      lang,
      begin: undefined,
      end: undefined,
      duration: undefined,
      location: undefined,
      description: utils.dehtml(item.description),
      speakers,
      enclosures: [],
      links: [],
      sessions: [],
    }
  });

  return sessions.filter(s => s !== null) as Session[];
}