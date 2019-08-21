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

// streamType can be hls, webm, dash, mp3, opus
// type can be dash, video or audio
export async function vocLiveStreams(slug: string, mediaType = 'video', streamType = 'hls') {
  const conferences = await axios.default.get('https://streaming.media.ccc.de/streams/v2.json')
  return parseVocStreams(conferences.data, mediaType, streamType);
}

async function vocVodSessionVideo(url: string) {
  const { data } = await axios.default.get(url)
  return data;
}

export async function vocVodSessionVideos(conferenceJson: any) {
  const { events } = conferenceJson;
  const eventResults = [];
  // eslint-disable-next-line
  for (const event of events) {
    try {
      // eslint-disable-next-line
      const eventResult = await vocVodSessionVideo(event.url);
      eventResults.push(eventResult);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('could not load', event.url, error.message);
    }
  }

  return eventResults;
}

export function addLiveStreamEnclosures(sessions: Session[], vocVideos: VocStream[]): Session[] {
  const untranslatedVocStreams = vocVideos.filter(v => !v.translated);
  const streamByRoomName = new Map<string, VocStream>();
  untranslatedVocStreams.forEach(v => streamByRoomName.set(v.name, v));

  return sessions.map(session => {
    const updatedSession = session;
    if (updatedSession.location && updatedSession.location.label_en) {
      const roomName = updatedSession.location.label_en;
      const stream = streamByRoomName.get(roomName);
      if (stream) {
        const liveStream: Enclosure = {
          url: stream.streamUrl,
          thumbnail: stream.thumbUrl,
          mimetype: "application/x-mpegurl",
          type: "livestream",
          languages: [session.lang.id],
        };
        updatedSession.enclosures.push(liveStream);
      }
    }
    
    return updatedSession;
  });
}

// export async function addEnclosuresFromVoc(allSession: Session[], vocJson: any, slug: string) {
//   const videos = parseVocStreams(vocJson, slug);

//   const sessions = allSession.map((session) => {
//     const video = videos.find(v => v.link === session.url);
//     const enclosure = enclosureFromVocJson(video);
//     if (!video || !enclosure) return null;
//     session.enclosures.push(enclosure);
//     return session;
//   });
//   return sessions;
// }
