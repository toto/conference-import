import { sessionsFromJson } from "./../../dataSources/pretalx/converters";
import * as fs from "fs";
import * as path from "path";


const json = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "fixtures",
    "pretalx",
    "sessions.json"
  ),
  "utf8"
);
const parsedJson = JSON.parse(json);
const sessions = sessionsFromJson(parsedJson, {
  format: "pretalx",
  eventId: "35c3",
  timezone: 'Europe/Berlin',
  baseUrl: "https://example.com",
  conferenceCode: "35c3oic",
  defaultTrack: { id: "track", event: "35c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
  defaultLanguageCode: 'de',
});




it("Should parse some session", () => {
  const [firstSession] = sessions;
  expect(firstSession).toBeTruthy();
  expect(firstSession.id).toBe("35c3oic-avfu8a");
  expect(firstSession.url).toBe(
    "https://example.com/35c3oic/talk/AVFU8A"
  );
  expect(firstSession.speakers.length).toBe(1);
  expect(firstSession.title).toBe(
    "Freifunk - The Next Generation"
  );
  expect(firstSession.track.label_en).toBe("Some Track");
  expect(firstSession.track.label_de).toBe(undefined);
  expect(firstSession.track.id).toBe("track");
});

it("Should parse all sessions", () => {
  expect(sessions.length).toBe(19);
});

it("Should parse multiple speakers sessions", () => {
  const session = sessions.find(s => s.id === "35c3oic-avfu8a");
  if (!session) {
    expect(false).toBe(true);
    return;
  }
  expect(session.speakers.length).toBe(1);

  const [a] = session.speakers;
  expect(a.id).toBe("35c3oic-jxbp8z");
  expect(a.name).toBe("Peter Buschkamp");
});





