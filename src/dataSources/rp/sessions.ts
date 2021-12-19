import * as moment from 'moment-timezone';
import * as utils from './utils';
import { Track, MiniTrack, Session, Subconference, MiniSpeaker, MiniLocation, Link } from '../../models';
import { languageFromString } from './language';


interface Options {
  sessionPostProcessing?(session: Session): Session | null
  eventId: string
  sessionLinkPrefix: string
  timezone: string
  subconferenceFinder?(session: Session, source: any): Subconference | undefined;
  defaultTrack: Track
  defaultLanguageName?: string
  filterSpeakerNames?: string[]
  filterSessionNames?: string[]
}

function videoLinkFromString(video: string, title: string): Link | null {
  if (video === "" || !video.includes('youtube')) return null;
  const ytregexes = [
    /\.com\/watch\?v=([a-zA-Z0-9_-]+)$/i,
    /\.com\/embed\/([a-zA-Z0-9_-]+)/i,
  ];

  for (const ytregex of ytregexes) {
    const match = video.match(ytregex);
    if (match && match[1]) {
      const vid = match[1];
      const ytrecording: Link = {
        thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
        title,
        url: `https://www.youtube.com/v/${vid}`,
        service: 'youtube',
        type: 'recording',
      };
      return ytrecording;
    }
  }

  return null;
}

export function sessionsFromJson(json: any, options: Options): Session[] {
  if (!Array.isArray(json)) return [];

  const sessions: (Session | null)[] = json.map((item) => {
    const name = utils.nameAndUrlFromHtmlLink(item.title) || { url: '' };
    if (name.name 
        && options.filterSessionNames 
        && options.filterSessionNames.includes(name.name)) {
          return null;
    }
    
    let track: MiniTrack
    if (utils.hasValue(item.track)) {
      track = {
        id: utils.mkId(utils.dehtml(item.track)),
        label_en: utils.dehtml(item.track),
        label_de: utils.dehtml(item.track),
      }
    } else {
      track = {
        id: options.defaultTrack.id,
        label_en: options.defaultTrack.label_en,
        label_de: options.defaultTrack.label_de,
      }
    }


    let lang = languageFromString(item.language);
    const { defaultLanguageName } = options;
    if (defaultLanguageName && !lang) {
      lang = languageFromString(defaultLanguageName);
    }

    if (!lang || !utils.hasValue(lang)) {
      return null;
    }

    let speakers: MiniSpeaker[] = [];

    utils.nameIdPairsFromCommaString(item.speaker, item.speaker_uid)
      .forEach(s => speakers.push(s));
    utils.nameIdPairsFromCommaString(item.moderator, item.moderator_uid)
      .forEach(s => speakers.push(s));

    if (options.filterSpeakerNames) {
      speakers = speakers.filter(s => !options.filterSpeakerNames!.includes(s.name))
    }

    let begin: moment.Moment | undefined;
    let end: moment.Moment | undefined;
    let duration: number | undefined;
    if (utils.hasValue(item.datetime_start) && utils.hasValue(item.datetime_end)) {
      begin = moment.tz(item.datetime_start, "YYYY-MM-DD'T'HH:mm:ss", options.timezone);
      end = moment.tz(item.datetime_end, "YYYY-MM-DD'T'HH:mm:ss", options.timezone);
      duration = end.diff(begin, 'minute');
    }

    let location: MiniLocation | undefined;
    if (utils.hasValue(item.room) && utils.hasValue(item.room_nid)) {
      location = {
        id: item.room_nid,
        label_en: item.room,
        label_de: item.room,
      }
    }

    const title = utils.dehtml(item.title_text);

    const links: Link[] = [];
    const videoLink = videoLinkFromString(item.video, title);
    if (videoLink) {
      links.push(videoLink);
    }

    let url = name.url;
    if (options.sessionLinkPrefix && !url.startsWith(options.sessionLinkPrefix)) {
      url = `${options.sessionLinkPrefix}${url}`;
    }


    let result: Session | null = {
      type: "session",
      id: item.nid,
      title,
      subtitle: undefined,
      abstract: utils.dehtml(item.short_thesis),
      event: options.eventId,
      url,
      track,
      lang,
      begin,
      end,
      duration,
      location,
      description: utils.dehtml(item.description),
      speakers,
      enclosures: [],
      links,
      cancelled: item.status === "Cancelled",
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