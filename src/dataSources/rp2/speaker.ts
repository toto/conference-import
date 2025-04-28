import { Speaker } from './../../models/speaker';
import { Link } from '../../models';
import { Rp2APIElement } from '.';
import { dehtml } from '../util';

interface Options {
  speakerPostProcessing?(speaker: Speaker): Speaker | null
  eventId: string
  speakerUrlPrefix: string
}

export function speakerFromApiSpeaker(apiSpeaker: Rp2APIElement, options: Options): Speaker | null {
  const {
    uid,
    position,
    name_raw,
    bio,
    organization_raw,
    links_raw,
    picture
  } = apiSpeaker;

  if (!options.speakerUrlPrefix) {
    throw new Error("speakerUrlPrefix is not configured but required")
  }
  
  if (!uid || typeof uid !== "string") return null;
  if (!name_raw || typeof name_raw !== "string") return null;
  if (name_raw.trim() === "") return null;

  const name = name_raw.replace(/\s+/g, ' ').trim();

  let biography: string | undefined
  if (bio && typeof bio === "string") {
    biography = dehtml(bio);
  }

  const links: Link[] = Object.keys(links_raw).map(label => {
    if (typeof links_raw !== "object") return null;
    const url = (links_raw as Record<string,string>)[label];
    if (typeof url !== "string") return null;
    return {
      type: "speaker-link",
      title: label,
      service: "web",
      url,
    }
  }).filter(l => l !== null) as Link[];  
  
  let organization: string | undefined
  if (organization_raw && typeof organization_raw === "object") {
    const [ key ] = Object.keys(organization_raw)
    if (key && typeof key === "string") {
      organization = key
      const orgLink = (organization_raw as Record<string, string>)[key];
      links.push({type: "speaker-link", title: key, service: "web", url: orgLink})
    }
    
  }

  let speaker: Speaker | null = { 
    id: uid, 
    name,
    position: typeof position === "string" ? position : undefined,
    biography,
    organization,
    photo: typeof picture === "string" ? picture : undefined,
    type: "speaker",
    event: options.eventId,
    links,
    sessions: [],
    url: `${options.speakerUrlPrefix}/${uid}`,
  }
  if (speaker?.name.trim() === "") {
    return null;
  }
  if (options.speakerPostProcessing && speaker) {
    speaker = options.speakerPostProcessing(speaker);
  }
  return speaker;
}

