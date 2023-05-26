import { Track } from "../../models";

/** Returns sourceId if id is found in the track mappings: id => [sourceId, foo, bar] */
export function normalizedTrackId(id: string, trackMappings: Record<string, Array<string>>): string {
  if (!trackMappings) throw new Error("trackMappings is required")
  if (!id) throw new Error("id required")
  for (const trackId in trackMappings) {
    if (Object.prototype.hasOwnProperty.call(trackMappings, trackId)) {
      const mappings = trackMappings[trackId];
      if (mappings?.includes(id)) {
        return trackId;
      }
    }
  }
  return id;
}

export function normalizedMiniTrack(id: string, trackMappings: Record<string, Array<string>>, tracks: Track[], defaultTrack: Track): Track {
  const normalizedId = normalizedTrackId(id, trackMappings);
  return tracks.find(t => t.id === normalizedId) ?? defaultTrack;
}

export function htmlListAndParagraphToString(source: string): string {
  let paragraphs = source
    .replace(/\n/gi, "")
    .replace(/\r/gi, "")
    .replace(/\t/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&uuml;/gi, "ü")
    .replace(/&auml;/gi, "ä")
    .replace(/&ouml;/gi, "ö")
    .replace(/&Uuml;/gi, "Ü")
    .replace(/&Auml;/gi, "Ä")
    .replace(/&Ouml;/gi, "Ö")    
    .replace(/&[a-z]+;/gi, "")
    .replace(/<br *\/?>/gi, "\n")
    .split(/<\/p *>/i)

  // TODO: use JSON file: https://html.spec.whatwg.org/entities.json

  paragraphs = paragraphs.map(paragraph => {
    paragraph = paragraph
      .replace(/<p *>/gi, "")
      .trimStart()
    let lists = paragraph.split(/<\/ul>/gi)
    lists = lists.map(list => {
      list = list.replace(/<ul *>/gi, "")
      list = list.replace(/<li *>/gi, "\n • ")
      list = list.replace(/<\/li *>/gi, "")
      return list;
    })

    return lists.join("\n\n")
  });

  return paragraphs
    .map(p => { 
      return p
        .replace(/<[^>]+>/g,'')
        .replace(/\n{3,}/g, "\n\n")
        .replace(/&gt;/gi, ">")
        .replace(/&lt;/gi, "<")
    })
    .join("\n\n")
    .trimEnd()
    .replace(/^(\n|\r)+/, "") // only replace newlines in the beginning. Leading spaces are fine
}


