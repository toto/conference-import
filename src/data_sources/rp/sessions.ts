import * as moment from 'moment-timezone';
import * as utils from './utils';
import { MiniTrack, Session, Subconference, MiniSpeaker } from '../../models';
import { languageFromString } from './language';


interface Options {
  sessionPostProcessing?(session: Session): Session | null
  eventId: string
  sessionLinkPrefix: string
  timezone: string
  subconferenceFinder?(session: Session, source: any): Subconference | undefined;
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

    let begin: moment.Moment | undefined;
    let end: moment.Moment | undefined;
    let duration: number | undefined;
    if (item.datetime_start && item.datetime_start !== "" &&
        item.datetime_end && item.datetime_end !== "") {
          begin = moment.tz(item.datetime_start, options.timezone);
          end = moment.tz(item.datetime_end, options.timezone);
          duration = end.diff(begin, 'minute');
    }

    let result: Session | null = {
      type: "session",
      id: item.nid,
      title: utils.dehtml(item.title_text),
      subtitle: undefined,
      abstract: utils.dehtml(item.short_thesis),
      event: options.eventId,
      url: `${options.sessionLinkPrefix}${name.url}`,
      track,
      lang,
      begin,
      end,
      duration,
      location: undefined,
      description: utils.dehtml(item.description),
      speakers,
      enclosures: [],
      links: [],
    }

    const { subconferenceFinder, sessionPostProcessing } = options;
    if (subconferenceFinder) {
      result.subconference = subconferenceFinder(result, item);
    }
    
    if (sessionPostProcessing) {
      result = sessionPostProcessing(result);
    }
    
    return result;
  });

  return sessions.filter(s => s !== null) as Session[];
}