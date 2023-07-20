import * as fs from "fs";
import * as path from "path";
import { C3NavPOI, poisFromFromC3Nav } from "../../dataSources/pois";


const json = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "fixtures",
    "c3nav-pois",
    "pois.json"
  ),
  "utf8"
);
const parsedJson = JSON.parse(json);

it("Should parse all pois", () => {
  const pois = poisFromFromC3Nav(parsedJson as C3NavPOI[], {eventId: "camp23"})
  expect(pois.length).toEqual(50);
})

it("Should parse pois correctly pois", () => {
  const [first] = poisFromFromC3Nav(parsedJson as C3NavPOI[], {eventId: "camp23"})
  expect(first.id).toEqual("36433")
  expect(first.type).toEqual("poi")
  expect(first.positions.length).toEqual(0)
  expect(first.label_en).toEqual("POC")
  expect(first.label_de).toEqual("POC")
  expect(first.category).toEqual("other")
  expect(first.geo_position.long).toEqual(13.30529)
  expect(first.geo_position.lat).toEqual(53.03107)
  expect(first.links.length).toEqual(0)
})