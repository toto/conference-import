import * as ent from 'ent';
import { createHash } from 'crypto';

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
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Generates a RFC 4122 version 5 (SHA-1, name-based) UUID,
 *  equivalent to Python's `uuid.uuid5(namespace, name)`. */
export function uuidv5(namespace: string, name: string): string {
  if (!UUID_REGEX.test(namespace)) {
    throw new Error(`Invalid UUID namespace: ${namespace}`);
  }
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1')
    .update(namespaceBytes)
    .update(Buffer.from(name, 'utf8'))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
