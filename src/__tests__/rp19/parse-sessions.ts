import { sessionsFromJson } from "./../../data_sources/rp/sessions";
import * as fs from "fs";
import * as path from "path";
import { Subconference } from "../../models";

describe("Import unscheduled sessions", () => {
  const json = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "fixtures",
      "rp19",
      "unscheduled-main-sessions.json"
    ),
    "utf8"
  );
  const parsedJson = JSON.parse(json);

  describe("basic parsing", () => {
    const sessions = sessionsFromJson(parsedJson, {
      eventId: "rp19",
      timezone: 'Europe/Berlin',
      sessionLinkPrefix: "https://example.com"
    });
    it("Should parse some session", () => {
      const [firstSession] = sessions;
      expect(firstSession).toBeTruthy();
      expect(firstSession.id).toBe("26887");
      expect(firstSession.url).toBe(
        "https://example.com/session/coding-initiatives-between-idealism-marketforce"
      );
      expect(firstSession.speakers.length).toBe(1);
      expect(firstSession.title).toBe(
        "Coding Initiatives: Between Idealism and Marketforce"
      );
      expect(firstSession.track.label_en).toBe("Research & Education");
      expect(firstSession.track.label_de).toBe("Research & Education");
      expect(firstSession.track.id).toBe("research-education");
    });

    it("Should parse all sessions", () => {
      expect(sessions.length).toBe(191);
    });

    it("Should parse multiple speakers sessions", () => {
      const session = sessions.find(s => s.id === "27252");
      if (!session) {
        expect(false).toBe(true);
        return;
      }
      expect(session.speakers.length).toBe(3);

      const [tori, ulrich, adriana] = session.speakers;
      expect(tori.id).toBe("14052");
      expect(tori.name).toBe("Tori Boeck");
      expect(ulrich.id).toBe("20119");
      expect(ulrich.name).toBe("Ulrich Binner");
      expect(adriana.id).toBe("14145");
      expect(adriana.name).toBe("Adriana Groh");
    });
  });

  describe("subconference finding", () => {
    const mediaConvention: Subconference = {
      id: 'media-convention',
      label: "Media Convention",
    }
    const sessions = sessionsFromJson(parsedJson, {
      eventId: "rp19",
      timezone: 'Europe/Berlin',
      sessionLinkPrefix: "https://example.com",
      subconferenceFinder: (session, source) => { 
        const { conference } = source;
        if (typeof(conference) === 'string' && conference.match(mediaConvention.label)) {
          return mediaConvention;
        }
        return undefined; 
      }
    });


    it("Should parse media convention", () => {
      const session = sessions.find(s => s.id === "32070");
      if (!session) {
        expect(false).toBe(true);
        return;
      }
      const { subconference } = session;
      if (!subconference) { expect(false).toBe(true); return }
      expect(subconference.id).toBe('media-convention');
    });
  });
});
