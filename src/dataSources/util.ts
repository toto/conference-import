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

export function mkId(str: string): string {
	return str.trim().replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase();
}

export function colorArrayFromHex(str: string): [number, number, number, number] | null {
  if (str.charAt(0) !== "#" || str.length !== 7) return null; 
  const result: [number, number, number, number] = [0,0,0,1]
  for (let index = 0; index < 3; index++) {
    const offset = 1 + (2 * index);
    const hex = str.slice(offset, offset + 2);
    result[index] = parseInt(hex, 16);
  }
  return result;
}