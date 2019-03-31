import { Session } from "../models";
import * as moment from 'moment-timezone';
import { stateForSession, SessionState } from "../models/session";
import { isoDayForSession } from "../importer/importer";

describe("Sessions", () => {

  const baseSession: Session = {
    id: "2342",
    type: "session",
    event: "some-event-2019",
    title: "This is a cool session",
    abstract: "Abstract is a short thing",
    description: "A longer description can also be provided",
    url: "https://example.com/session/2342",
    speakers: [{id: "42", name: "Bob"}],
    enclosures: [],
    links: [],
    track: {id: 'cool-track', label_en: "Cool Track"},
    lang: {id: 'en', label_en: "English"},
  }

  describe('scheduled session', () => {
    const scheduledSession = {...baseSession};
    scheduledSession.begin = moment('2019-03-30T12:00:00+0100');
    scheduledSession.end = moment('2019-03-30T12:23:00+0100');
    scheduledSession.duration = 23;
    scheduledSession.location = {
      id: "some-room",
      label_en: "Some Room",
    };

    it("should determine session state as scheduled", () => {
      expect(stateForSession(scheduledSession)).toBe(SessionState.SCHEDULED);
    });

    it("should find the correct day", () => {
      const day = isoDayForSession(scheduledSession, 'Europe/Berlin', 4);
      expect(day).toBe('2019-03-30');
    });

    it("should find the correct day for very early session", () => {
      const earlySession = {...scheduledSession};
      earlySession.begin = moment('2019-03-30T02:00:00+0100');
      earlySession.end = moment('2019-03-30T02:23:00+0100');
      const day = isoDayForSession(earlySession, 'Europe/Berlin', 4);
      expect(day).toBe('2019-03-29');
    });
  });

  describe("unscheduled session", () => {
    const unscheduledSession = {...baseSession};
    delete unscheduledSession.begin;
    delete unscheduledSession.end;
    delete unscheduledSession.location;
    delete unscheduledSession.duration;

    it("should determine session state as planned", () => {
      expect(stateForSession(unscheduledSession)).toBe(SessionState.PLANNED);
    });
  });
});