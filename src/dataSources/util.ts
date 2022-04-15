import * as ent from 'ent';

/** Normalizes a string as a pseudo id 
 *  (lowercase, removing all non-ascii chars, etc.) */
export function normalizedForId(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-zA-Z0-9_]/i, '-');
}

export function dehtml(str: string): string {
  if (typeof str !== 'string') return str;
  const nohtml = str.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'')
  return ent.decode(nohtml);
}
