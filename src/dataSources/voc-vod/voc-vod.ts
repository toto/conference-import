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

function addRecordingEnclosure(video: VocVideo, session: Session): Session {
  const result = session;

  let resultRecording: VocRecording | undefined;

  const orderedRecordings = video.recordings.sort(r => r.high_quality ? -1 : 1);
  resultRecording = orderedRecordings.find(recording => {
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