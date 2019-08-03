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
      name: RegExp.$2 ? ent.decode(RegExp.$2) : undefined,
    }
  }
  return null;
}

export function undefinedIfEmpty(str?: string): string | undefined {
  if (!str) return undefined;
  if (str.trim() === "") return undefined;
  return str;
}

export function hasValue(value: any): boolean {
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  return value !== undefined && value !== null;
}

export function mkId(str: string): string {
	return str.trim().replace(/[^A-Za-z0-9_\-]+/g, '-').toLowerCase();
}

interface NameAndId {
  id: string
  name: string
}

export function nameIdPairsFromCommaString(nameString: string, idString: string, seperator = ", ", dehtmlNames = true): NameAndId[] {
  if (nameString === "" || idString === "") return [];

  const ids: string[] = idString.split(seperator);
  const names: string[] = nameString.split(seperator);
  const result: NameAndId[] = [];
  ids.forEach((id, index) => {
    if (names.length > index) {
      const speakerName = dehtmlNames ? ent.decode(names[index]) : names[index];
      result.push({ id, name: speakerName });
    }
  });
  return result;
}