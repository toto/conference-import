import { Rp2APIElement } from ".";
import { Link } from "../../models";

/**
 * 
 * @param rawPartners 
 * @returns A map of link title (DE and EN) linking to the link object.
 */
export function partnerLinks(rawPartners: Rp2APIElement[]): Record<string, Link> {
  const result: Record<string, Link> = {};

  const partners = rawPartners.map(p => parsePartner(p)).filter(p => p !== null) as PartnerI[]
  for (const partner of partners) {
    if (partner.language !== "en") continue;
    const dePartner = partners.find(p => p.language === "de" && p.id === partner.id)
    if (!dePartner) continue;
    
    let url: string | undefined
    let title: string | undefined
    for (const name of Object.keys(partner.links)) {
      const link = partner.links[name];
      if (link && name) {
        url = link
        title = name
        break;
      }
    }
    if (!url || !title) continue;
    
    const link: Link = {
      url: url,
      type: "session-link",
      title: `Partner: ${title}`,
      service: "web",
    }

    result[dePartner.title] = link;
    result[partner.title] = link;
  }

  return result;
}

interface PartnerI {
  language: string
  id: string
  url: string
  body: string
  title: string
  logo: string
  links: Record<string, string>
}

function parsePartner(partner: Rp2APIElement): PartnerI | null {
  const { language, id, url, body, title, links, logo } = partner;
  if (typeof language !== "string" ||
      typeof id !== "string" ||
      typeof url !== "string" || 
      typeof title !== "string" ||
      typeof body !== "string" ||
      typeof logo !== "string" ||
      typeof links !== "object") return null;
  
  return partner as unknown as PartnerI
}