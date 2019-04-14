import { Speaker } from './../../models/speaker';
import * as utils from './utils';
import { Link } from '../../models';


interface Options {
  speakerPostProcessing?(speaker: Speaker): Speaker | null
  eventId: string
  picturePrefix: string
  speakerLinkPrefix: string
  filterSpeakerNames?: string[]
}

export function speakersFromJson(json: any, options: Options): Speaker[] {
  if (!Array.isArray(json)) return [];

  const speakers: (Speaker | null)[] = json.map((item) => {
    const name = utils.nameAndUrlFromHtmlLink(item.name) || { url: '' };
    if (name.name 
      && options.filterSpeakerNames 
      && options.filterSpeakerNames.includes(name.name)) {
      return null;
    }
    
    const organization = utils.nameAndUrlFromHtmlLink(item.organization) || { url: '' };

    const links: Link[] = [];

    const sourceLinks: string[] = item.links.split(', ');
    sourceLinks.forEach(sourceLink => {
      const result = utils.nameAndUrlFromHtmlLink(sourceLink);
      if (!result) return;
      links.push({
          url: result.url,
          title: result.name || item.name,
          type: 'speaker-link',
          service: 'web'
      });
    });

    return {
      id: item.uid,
      name: utils.dehtml(item.name),
      type: "speaker",
      event: options.eventId,
      photo: `${options.picturePrefix}${item.picture}`,
      url: `${options.speakerLinkPrefix}${name.url}`,
      organization: organization.name || "",
      position: item.position,
      biography: utils.dehtml(item.bio),
      links,
      sessions: [],
    }
  });
  
  return speakers.filter(s => s !== null) as Speaker[];
}