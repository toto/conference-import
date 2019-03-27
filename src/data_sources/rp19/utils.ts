import * as ent from 'ent';

export function dehtml(str: string): string {
  if (typeof str !== 'string') return str;
  const nohtml = str.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'')
  return ent.decode(nohtml);
}