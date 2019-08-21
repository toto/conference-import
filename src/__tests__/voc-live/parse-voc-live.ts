import { parseVocStreams, addLiveStreamEnclosures } from './../../dataSources/voc-live/voc-live';
import { sessionsFromJson } from "./../../dataSources/frab/converters";
import * as fs from 'fs';
import * as path from 'path';

describe('Import live VOC data', () => {
  const liveJson = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'voc-live', 'voc-live-camp.json'), 'utf8');
  const campScheduleJson = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'camp19', 'camp-19-schedule.json'), 'utf8');
  const parsedLiveJson = JSON.parse(liveJson);
  const campSchedule = JSON.parse(campScheduleJson);
  it('Should parse live stream', () => {
      const vocStreams = parseVocStreams(parsedLiveJson, 'camp2019');
      expect(vocStreams.length).toEqual(12);
      const [ firstStream ] = vocStreams;
      expect(firstStream.name).toEqual("Curie");
      expect(firstStream.roomSlug).toEqual("tent-1");
      expect(firstStream.translated).toEqual(false);
  });

  it('Should associate voc streams to sessions', () => {
    const vocStreams = parseVocStreams(parsedLiveJson, 'camp2019');
    const sessions = sessionsFromJson(campSchedule, {
      format: "frab",
      eventId: "camp19",
      timezone: 'Europe/Berlin',
      frabBaseUrl: "https://fahrplan.events.ccc.de/camp/2019/Fahrplan",
      defaultTrack: { id: "track", event: "camp19", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
      defaultLanguageCode: 'de',
    });
    const updatedSessions = addLiveStreamEnclosures(sessions, vocStreams);
    expect(updatedSessions.length).toEqual(sessions.length);
    
    const sessionsInCurie = updatedSessions.filter(s => s.location!.id === "curie");
    sessionsInCurie.forEach(s => expect(s.enclosures.filter(e => e.type === 'livestream').length).toEqual(1) );
    

    const sessionsInMeitner = updatedSessions.filter(s => s.location!.id === "meitner");
    sessionsInMeitner.forEach(s => expect(s.enclosures.filter(e => e.type === 'livestream').length).toEqual(1) );
  });
});