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
      "rp18",
      "rp18-sessions.json"
    ),
    "utf8"
  );
  const parsedJson = JSON.parse(json);

  describe("basic parsing", () => {
    const sessions = sessionsFromJson(parsedJson, {
      eventId: "rp18",
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
});
