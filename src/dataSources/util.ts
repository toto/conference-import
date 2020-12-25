/** Normalizes a string as a pseudo id 
 *  (lowercase, removing all non-ascii chars, etc.) */
export function normalizedForId(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-zA-Z0-9_]/i, '-');
}