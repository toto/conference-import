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