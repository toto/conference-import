import * as axios from 'axios';
import { Session, Enclosure } from '../../models';

interface VocConference {
  events: { link: string, url: string }[];
  acronym: string;
}

interface VocVideo {
  poster_url: string;
  link: string;
  recordings: VocRecording[];
}

interface VocRecording {
  folder: "webm-hd" | "webm-sd" | "h264-sd" | "h264-hd";
  high_quality: boolean;
  recording_url: string;
  mime_type: string;
  language: "eng" | "deu" | "eng-deu"
}


interface VocReliveStream {
  guid: string;
  mp4: string;
  playlist: string;
  thumbnail: string;
  title: string;
  status: "recorded" | "live";
}

function addReliveEnclosure(relive: VocReliveStream, session: Session, useMp4 = false): Session {
  const result = session;

  if (relive.status === "recorded" && relive.guid === session.id) {
    if (useMp4) {
      const enclosure: Enclosure = {
        url: `https:${relive.mp4}`,
        mimetype: "video/mp4",
        type: "recording",
        title: session.title,
        thumbnail: `https:${relive.thumbnail}`,
      };
      result.enclosures.push(enclosure);
    } else {
      const enclosure: Enclosure = {
        url: `https:${relive.playlist}`,
        mimetype: "application/x-mpegurl",
        type: "recording",
        title: session.title,
        thumbnail: `https:${relive.thumbnail}`,
      };
      result.enclosures.push(enclosure);
    }
  }

  return result;
}

function addRecordingEnclosure(video: VocVideo, session: Session): Session {
  const result = session;

  const orderedRecordings = video.recordings.sort(r => r.high_quality ? -1 : 1);
  const resultRecording: VocRecording | undefined = orderedRecordings.find(recording => {
    if ((session.lang.id === "de" && recording.language === "deu") ||
      (session.lang.id === "en" && recording.language === "eng")) {
      return recording.mime_type === "video/mp4";
    }
    return false;
  });

  if (resultRecording) {
    const enclosure: Enclosure = {
      url: resultRecording.recording_url,
      mimetype: resultRecording.mime_type,
      type: "recording",
      title: session.title,
      thumbnail: video.poster_url,
    };
    result.enclosures.push(enclosure);
  }

  return result;
}


export async function addReliveEnclosures(slug: string, sessions: Session[]): Promise<Session[]> {
  const sessioById = new Map<string, Session>();
  sessions.forEach(s => sessioById.set(s.id, s));
  const url = `https://cdn.c3voc.de/relive/${slug}/index.json`;
  const { data }: { data: VocReliveStream[] } = await axios.default.get(url);

  data.forEach(reliveStream => {
    if (reliveStream.status !== "recorded") return;

    const session = sessioById.get(reliveStream.guid);
    if (!session) return;

    // Only add re-live if we don't have recordings yet
    const exsistingRecordings = session.enclosures.filter(e => e.type === "recording");
    if (exsistingRecordings.length > 0) return;

    const resultSession = addReliveEnclosure(reliveStream, session);
    sessioById.set(resultSession.id, resultSession);
  });

  return Array.from(sessioById.values());
}

export async function addRecordingEnclosues(slug: string, sessions: Session[]): Promise<Session[]> {
  const sessioById = new Map<string, Session>();
  sessions.forEach(s => sessioById.set(s.id, s));

  const url = `https://api.media.ccc.de/public/conferences/${slug}`
  const { data } = await axios.default.get(url);
  const vocConf = data as VocConference;
  const sessionUrls = sessions.map(s => s.url);
  const sessionUrlsWithSlash = sessions.map(s => `${s.url}/`);
  const vocVideoPromises = vocConf.events.filter(e => sessionUrls.includes(e.link) || sessionUrlsWithSlash.includes(e.link)).map(e => axios.default.get(e.url));
  for (const vocVideoPromise of vocVideoPromises) {
    try {
      const vocVideoResponse = await vocVideoPromise;
      const vocVideo: VocVideo = vocVideoResponse.data;
      let session = sessions.find(s => s.url === vocVideo.link);
      if (!session) {
        session = sessions.find(s => `${s.url}/` === vocVideo.link);
      }
      if (session) {
        const resultSession = addRecordingEnclosure(vocVideo, session);
        sessioById.set(resultSession.id, resultSession);
      }
    } catch (e) {
      console.error(`Could not load VOC VOD video: ${e}`)
      continue;
    }
  }
  return Array.from(sessioById.values());
}