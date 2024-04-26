import { speakersFromJson } from "./../../dataSources/pretalx/converters";
import * as fs from "fs";
import * as path from "path";


const json = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "fixtures",
    "pretalx",
    "speakers.json"
  ),
  "utf8"
);
const parsedJson = JSON.parse(json);
const spakers = speakersFromJson(parsedJson, {
  format: "pretalx",
  eventId: "35c3",
  timezone: 'Europe/Berlin',
  baseUrl: "https://example.com/",
  conferenceCode: "35c3oic",
  defaultTrack: { id: "track", event: "35c3", label_en: "Some Track", color: [0, 0, 0, 1], type: "track" },
  defaultLanguageCode: 'de',
});




it("Should parse some session", () => {
  const [firstSpeaker] = spakers;
  expect(firstSpeaker).toBeTruthy();
  expect(firstSpeaker.id).toBe("35c3oic-jludrk");
  expect(firstSpeaker.url).toBe(
    "https://example.com/35c3oic/speaker/JLUDRK"
  );
  expect(firstSpeaker.name).toBe("Anja")
});

it("Should parse all sessions", () => {
  expect(spakers.length).toBe(25);
});





