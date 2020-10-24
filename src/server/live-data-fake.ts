import * as moment from 'moment-timezone';
import { ConferenceData } from '../importer/importer';
import { Session } from '../models';

export function makeConferenceLive(now: moment.Moment, data: ConferenceData): ConferenceData {
  const newData = { ...data };
  const sessions = data.sessions
    .filter(s => !s.subconference)
    .sort((a, b) => {
      if (!a.begin || !b.begin) {
        return +1;
      }
      return moment(a.begin).unix() < moment(b.begin).unix() ? -1 : +1;
    })
  const firstScheduledSession = sessions.find(s => !!s.begin)
  const lastScheduledSession = [...sessions].reverse().find(s => !!s.begin);

  if (!firstScheduledSession || !lastScheduledSession) {
    console.warn("No scheduled sessions, cannot make conference live")
    return data;
  }
  const addTime = now.unix() - moment(firstScheduledSession.begin!).unix() - 60;
  newData.sessions = sessions.map(session => updateSession(session, addTime));

  console.info(`${newData.sessions[0].title} (${newData.sessions[0].id}) now starts at ${newData.sessions[0].begin} (${addTime}s later)`)
  return newData;
}

function updateSession(session: Session, addTime: number): Session {
  if (!session.begin || !session.end) return session;
  const newSession = { ...session };
  const newBegin = moment(session.begin);
  const newEnd = moment(session.end);
  newBegin.add(addTime, 'seconds');
  newEnd.add(addTime, 'seconds');
  newSession.enclosures = newSession.enclosures.map(e => {
    if (e.type !== 'livestream') return e;
    e.url = "https://artelive-lh.akamaihd.net/i/artelive_de@393591/master.m3u8"
    return e;
  })

  newSession.begin = newBegin.format() as unknown as moment.Moment;
  newSession.end = newEnd.format() as unknown as moment.Moment;
  return newSession
}