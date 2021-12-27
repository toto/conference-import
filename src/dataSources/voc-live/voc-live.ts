import * as axios from "axios";
import { Enclosure, Session } from "../../models";

interface VocStream {
  roomSlug: string,
  name: string,
  thumbUrl: string,
  streamUrl: string,
  translated: boolean,
}

export function parseVocStreams(json: any, slug: string, mediaType = 'video', streamType = 'hls'): VocStream[] {
  const streams: VocStream[] = [];
  const conference = json.find((a: {slug: string}) => a.slug === slug);
  if (conference) {
    conference.groups.forEach((group: any) => {
      group.rooms.forEach((room: any) => {
        room.streams.forEach((stream: any) => {
          // stream.urls.forEach((streamUrl))
          const streamUrl = stream.urls[streamType];
          if (!streamUrl || stream.type !== mediaType) return;
          streams.push({
            roomSlug: room.slug,
            name: room.schedulename,
            thumbUrl: room.thumb,
            streamUrl: streamUrl.url,
            translated: stream.isTranslated,
          });
        });
      });
    });
  }
  return streams;
}

export function enclosureFromVocJson(vocJson: any, mimeType = 'video/mp4'): Enclosure | undefined {
  const poster = vocJson.poster_url;
  const streamUrl = vocJson.recordings.find((r: any) => r.mime_type === mimeType && r.filename.indexOf('slides') === -1);
  if (!streamUrl) return undefined;
  return {
    url: streamUrl.recording_url,
    mimetype: mimeType,
    type: 'recording',
    thumbnail: poster,
  };
}

export enum VocLiveStreamType {
  hls = "hls",
  webm = "webm",
  dash = "dash",
  mp3 = "mp3",
  opus = "opus",
}

export enum VocLiveMediaType {
  audio = "video",
  video = "video",
  dash = "dash",
}

/** Loads live stream data from a running conference. 
 * Defaults to `https://streaming.media.ccc.de/streams/v2.json`
 * To test use `https://streaming.test.c3voc.de/streams/v2.json`
 */
export async function loadVocLiveStreams(slug: string, mediaType: VocLiveMediaType = VocLiveMediaType.video, streamType: VocLiveStreamType = VocLiveStreamType.hls, streamApiUrl = 'https://streaming.media.ccc.de/streams/v2.json') {
  const conferences = await axios.default.get(streamApiUrl)
  return parseVocStreams(conferences.data, slug, mediaType, streamType);
}


export function addLiveStreamEnclosures(sessions: Session[], vocVideos: VocStream[]): Session[] {
  const untranslatedVocStreams = vocVideos.filter(v => !v.translated);
  const streamByRoomName: Record<string, VocStream> = {};
  untranslatedVocStreams.forEach(v => streamByRoomName[v.name.toLowerCase()] = v);

  return sessions.map(session => {
    const updatedSession = session;
    if (updatedSession.location && updatedSession.location.label_en) {
      const roomNameEn = updatedSession.location.label_en.toLowerCase();
      const roomNameDe = updatedSession.location.label_de?.toLowerCase();
      const stream = streamByRoomName[roomNameEn] ?? streamByRoomName[roomNameDe ?? ''];
      if (stream) {
        const liveStream: Enclosure = {
          url: stream.streamUrl,
          thumbnail: stream.thumbUrl,
          mimetype: "application/x-mpegurl",
          type: "livestream",
          languages: [session.lang.id],
        };
        updatedSession.enclosures.push(liveStream);
      } else {
        if (process.env.DEBUG) { 
          console.info(`Found no stream for room '${roomNameEn}' in ${JSON.stringify(Object.keys(streamByRoomName))}`)
        }
      }
    }
    
    return updatedSession;
  });
}
