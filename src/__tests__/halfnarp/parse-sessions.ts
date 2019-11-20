import { sessionsFromJson } from "./../../dataSources/halfnarp/converters";
import * as fs from "fs";
import * as path from "path";
import { HalfnarpSourceFormat } from "../../dataSources/halfnarp";


const json = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "fixtures",
    "halfnarp",
    "36c3.json"
  ),
  "utf8"
);
const parsedJson = JSON.parse(json);

const config: HalfnarpSourceFormat = {
  format: "halfnarp",
  eventId: "36c3",
  timezone: 'Europe/Berlin',
  sourceUrl: "https://halfnarp.events.ccc.de/-/talkpreferences?format=json",
  sessionBaseUrl: "https://fahrplan.events.ccc.de/congress/2019/Fahrplan/events/",
  defaultTrack: { id: "track", event: "36c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
  defaultLanguageCode: 'de',
  tracks: [{
    id: "36c3-art-culture",
    color: [249,176,0,1],
    label_en: "Art & Culture",
    label_de: "Art & Culture",
    event: "36c3",
    type: "track"
  },
  {
    id: "36c3-ethics-society-politics",
    color: [228,4,41,1],
    label_en: "Ethics, Society & Politics",
    label_de: "Ethics, Society & Politics",
    event: "36c3",
    type: "track"
  }
],
  trackIdMap: {
    "357": "36c3-art-culture",
    "360": "36c3-ethics-society-politics",
  }
}

it("Should parse some session", () => {
  const sessions = sessionsFromJson(parsedJson, config);
  const [firstSession] = sessions;
  expect(firstSession).toBeTruthy();
  expect(firstSession.id).toBe("10496");
  expect(firstSession.url).toBe(
    "https://fahrplan.events.ccc.de/congress/2019/Fahrplan/events/10496.html"
  );
  expect(firstSession.speakers.length).toBe(1);
  const [firstSpeaker] = firstSession.speakers;
  expect(firstSpeaker.id).toBe('36c3-arne-semsrott');
  expect(firstSpeaker.name).toBe('Arne Semsrott');

  expect(firstSession.title).toBe(
    "Das Mauern muss weg"
  );
  expect(firstSession.track.label_en).toBe("Ethics, Society & Politics");
  expect(firstSession.track.label_de).toBe("Ethics, Society & Politics");
  expect(firstSession.track.id).toBe("36c3-ethics-society-politics");
});

it("Should parse all sessions", () => {
  const sessions = sessionsFromJson(parsedJson, config);
  expect(sessions.length).toBe(140);
});

it("Should parse multiple speakers sessions", () => {
  const sessions = sessionsFromJson(parsedJson, config);
  const session = sessions.find(s => s.id === "10542");
  if (!session) {
    expect(false).toBe(true);
    return;
  }
  expect(session.speakers.length).toBe(2);

  const [a, b] = session.speakers;
  expect(a.id).toBe("36c3-peter-schmidt");
  expect(a.name).toBe("Peter Schmidt");
  expect(b.id).toBe("36c3-heurekus");
  expect(b.name).toBe("Heurekus");
});





