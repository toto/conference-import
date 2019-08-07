import { sessionsFromJson } from "./../../dataSources/frab/converters";
import * as fs from "fs";
import * as path from "path";


const json = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "fixtures",
    "frab",
    "camp-schedule.json"
  ),
  "utf8"
);
const parsedJson = JSON.parse(json);


it("Should parse some session", () => {
  const sessions = sessionsFromJson(parsedJson, {
    format: "frab",
    eventId: "camp19",
    timezone: 'Europe/Berlin',
    frabBaseUrl: "https://fahrplan.events.ccc.de/camp/2019/Fahrplan",
    defaultTrack: { id: "track", event: "35c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
    defaultLanguageCode: 'de',
  });
  const [firstSession] = sessions;
  expect(firstSession).toBeTruthy();
  expect(firstSession.id).toBe("10386");
  expect(firstSession.url).toBe(
    "https://fahrplan.events.ccc.de/camp/2019/Fahrplan/events/10386.html"
  );
  expect(firstSession.speakers.length).toBe(0);
  expect(firstSession.title).toBe(
    "Opening Ceremony"
  );
  expect(firstSession.track.label_en).toBe("CCC");
  expect(firstSession.track.label_de).toBe("CCC");
  expect(firstSession.track.id).toBe("camp19-ccc");
});

it("Should parse all sessions", () => {
  const sessions = sessionsFromJson(parsedJson, {
    format: "frab",
    eventId: "camp19",
    timezone: 'Europe/Berlin',
    frabBaseUrl: "https://fahrplan.events.ccc.de/camp/2019/Fahrplan",
    defaultTrack: { id: "track", event: "35c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
    defaultLanguageCode: 'de',
  });
  expect(sessions.length).toBe(72);
});

it("Should parse multiple speakers sessions", () => {
  const sessions = sessionsFromJson(parsedJson, {
    format: "frab",
    eventId: "camp19",
    timezone: 'Europe/Berlin',
    frabBaseUrl: "https://fahrplan.events.ccc.de/camp/2019/Fahrplan",
    defaultTrack: { id: "track", event: "35c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
    defaultLanguageCode: 'de',
  });
  const session = sessions.find(s => s.id === "10380");
  if (!session) {
    expect(false).toBe(true);
    return;
  }
  expect(session.speakers.length).toBe(2);

  const [a, b] = session.speakers;
  expect(a.id).toBe("4601");
  expect(a.name).toBe("bigalex");
  expect(b.id).toBe("8067");
  expect(b.name).toBe("honky");
});





