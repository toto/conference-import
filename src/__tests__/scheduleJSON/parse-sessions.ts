import { sessionsFromJson } from "./../../dataSources/scheduleJSON/converters";
import * as fs from "fs";
import * as path from "path";


const json = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "fixtures",
    "scheduleJSON",
    "schedule.json"
  ),
  "utf8"
);
const parsedJson = JSON.parse(json);


it("Should parse some session", () => {
  const sessions = sessionsFromJson(parsedJson, [], {
    format: "scheduleJSON",
    eventId: "37c3",
    scheduleURL: "https://fahrplan.events.ccc.de/congress/2023/Fahrplan/schedule.json",
    defaultTrack: { id: "track", event: "37c3", label_en: "CCC", color: [0, 0, 0, 1], type: "track" },
  });
  const [firstSession] = sessions;
  expect(firstSession).toBeTruthy();
  expect(firstSession.id).toBe("fddf9aa7-4952-497e-b706-2e802deef3cc");
  expect(firstSession.url).toBe(
    "https://events.ccc.de/congress/2023/hub/en/event/37c3_feierliche_eroffnung/"
  );
  expect(firstSession.speakers.length).toBe(3);
  expect(firstSession.title).toBe(
    "37C3: Feierliche Eröffnung"
  );
  expect(firstSession.track.label_en).toBe("CCC");
  expect(firstSession.track.id).toBe("track");
});

it("Should parse all sessions", () => {
  const sessions = sessionsFromJson(parsedJson, [], {
    format: "scheduleJSON",
    eventId: "37c3",
    scheduleURL: "https://fahrplan.events.ccc.de/congress/2023/Fahrplan/schedule.json",
    defaultTrack: { id: "track", event: "37c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
  });
  expect(sessions.length).toBe(8);
});

it("Should parse multiple speakers sessions", () => {
  const sessions = sessionsFromJson(parsedJson, [], {
    format: "scheduleJSON",
    eventId: "37c3",
    scheduleURL: "https://fahrplan.events.ccc.de/congress/2023/Fahrplan/schedule.json",
    defaultTrack: { id: "track", event: "37c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
  });
  const session = sessions.find(s => s.id === "fddf9aa7-4952-497e-b706-2e802deef3cc");
  if (!session) {
    expect(false).toBe(true);
    return;
  }
  expect(session.speakers.length).toBe(3);

  const [a, b, c] = session.speakers;
  expect(a.id).toBe("a57b4a91-0621-553c-a97d-6b47df0f3f0e");
  expect(a.name).toBe("derPUPE");
  expect(b.id).toBe("a8991e85-b553-5ed0-bc66-c219d3d8ba2f");
  expect(b.name).toBe("Katharina Nocun");
  expect(c.id).toBe("a51ee48a-4185-58b4-a664-da02a3caa3ca");
  expect(c.name).toBe("Mullana");  
});





