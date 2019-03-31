import { sessionsFromJson } from "./../../dataSources/rp/sessions";
import * as fs from "fs";
import * as path from "path";
import { Subconference } from "../../models";
import * as moment from 'moment-timezone';

describe("Import unscheduled sessions", () => {
  const json = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "fixtures",
      "rp18",
      "rp18-sessions.json"
    ),
    "utf8"
  );
  const parsedJson = JSON.parse(json);

  describe("basic parsing", () => {
    const sessions = sessionsFromJson(parsedJson, {
      eventId: "rp18",
      timezone: 'Europe/Berlin',
      sessionLinkPrefix: "https://example.com"
    });
    it("Should parse some session", () => {
      const [firstSession] = sessions;
      expect(firstSession).toBeTruthy();
      expect(firstSession.id).toBe("25183");
      expect(firstSession.url).toBe(
        "https://example.com/session/rp18-comix"
      );
      expect(firstSession.speakers.length).toBe(3);
      expect(firstSession.title).toBe(
        "#rp18 comix"
      );
      expect(firstSession.track.label_en).toBe("re:publica");
      expect(firstSession.track.label_de).toBe("re:publica");
      expect(firstSession.track.id).toBe("re-publica");
    });

    it("Should parse all sessions", () => {
      expect(sessions.length).toBe(528);
    });

    it("Should parse multiple speakers sessions", () => {
      const session = sessions.find(s => s.id === "25183");
      if (!session) {
        expect(false).toBe(true);
        return;
      }
      expect(session.speakers.length).toBe(3);

      const [a, b, c] = session.speakers;
      expect(a.id).toBe("4794");
      expect(a.name).toBe("Tim Gaedke");
      expect(b.id).toBe("2414");
      expect(b.name).toBe("Johannes Kretzschmar");
      expect(c.id).toBe("4795");
      expect(c.name).toBe("Jeff Chi");
    });
  });

  describe("subconference finding", () => {
    const mediaConvention: Subconference = {
      id: 'media-convention',
      label: "Media Convention",
    }
    const sessions = sessionsFromJson(parsedJson, {
      eventId: "rp19",
      sessionLinkPrefix: "https://example.com",
      timezone: 'Europe/Berlin',
      subconferenceFinder: (session, source) => { 
        const { conference } = source;
        if (typeof(conference) === 'string' && conference.match(mediaConvention.label)) {
          return mediaConvention;
        }
        return undefined; 
      }
    });


    it("Should parse media convention", () => {
      const session = sessions.find(s => s.id === "23764");
      if (!session) {
        expect(false).toBe(true);
        return;
      }
      const { subconference } = session;
      if (!subconference) { expect(false).toBe(true); return }
      expect(subconference.id).toBe('media-convention');
    });
  });

  describe("Date and location parsing", () => {
    const sessions = sessionsFromJson(parsedJson, {
      eventId: "rp18",
      timezone: 'Europe/Berlin',
      sessionLinkPrefix: "https://example.com"
    });

    it('should parse date and time correctly', () => {
      const session = sessions.find(s => s.id === "25362");
      if (!session) {
        expect(false).toBe(true);
        return;
      }

      expect(session.title).toBe("Thessaloniki: An emerging (It) destination Young – Creative – Innovative");

      const { begin, end, duration } = session;
      if (!begin || !end || !duration) {
        expect(false).toBe(true);
        return;
      }

      const sessionBegin = moment('2018-05-02T10:15:00+0200');
      const sessionEnd = moment('2018-05-02T10:45:00+0200');
      expect(sessionBegin.isSame(begin)).toBe(true);
      expect(sessionEnd.isSame(end)).toBe(true);
      expect(duration).toEqual(30);
    });

    it('should parse location correctly', () => {
      const session = sessions.find(s => s.id === "25362");
      if (!session) {
        expect(false).toBe(true);
        return;
      }

      expect(session.title).toBe("Thessaloniki: An emerging (It) destination Young – Creative – Innovative");

      const { location } = session;
      if (!location) {
        expect(false).toBe(true);
        return;
      }

      expect(location.label_en).toBe("Stage 8");
      expect(location.id).toBe("24465");
    });

    it('should cancelled correctly', () => {
      const session = sessions.find(s => s.id === "24770");
      if (!session) {
        expect(false).toBe(true);
        return;
      }

      expect(session.cancelled).toBe(true);
    });
  });
});
