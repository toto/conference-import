import * as ent from 'ent';

export function dehtml(str: string): string {
  if (typeof str !== 'string') return str;
  const nohtml = str.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'')
  return ent.decode(nohtml);
}

interface NameAndUrl {
  url: string
  name?: string
}

export function nameAndUrlFromHtmlLink(linkStr: string): NameAndUrl | null {
  if (linkStr.match(/ href="([^"]*)".*>(.+)<\/a>/i) && RegExp.$1) {
    return {
      url: RegExp.$1,
      name: RegExp.$2,
    }
  }
  return null;
}