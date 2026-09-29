import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import * as http from "http";
import { AddressInfo } from "net";
import { C3NavMap, C3NavMapConfiguration, StaticMap } from "../../models/map";
import { Session } from "../../models";
import { addMapNavigationLinks, mergeMaps, normalizeMap } from "../../importer/maps";
import { Configuration, dumpNormalizedConference } from "../../importer/dumper";
import { ConferenceData } from "../../importer/importer";
import { mapsFromJson } from "../../dataSources/ocdata/converters";
import * as scheduleJSON from "../../dataSources/scheduleJSON";
import * as frab from "../../dataSources/frab";
import { EventDataStore } from "../../server/eventDataStore";
import { buildApp } from "../../server";
import { ScheduleJSONDataSourceFormat } from "../../dataSources/scheduleJSON/dataFormat";
import * as moment from "moment-timezone";

const descriptor: C3NavMapConfiguration = {
  id: "venue", provider: "c3nav", label_en: "Venue", is_indoor: true,
  is_outdoor: false, order_index: 0, pois: [],
  c3nav: {
    base_url: "https://maps.example.test/congress",
    floors: [
      { id: 20, slug: "mezzanine", level_index: "0-1", label_en: "Mezzanine", order_index: 1, on_top_of: 10 },
      { id: 10, slug: "ground", level_index: "0", label_en: "Ground", order_index: 0, on_top_of: null },
    ],
    default_level_id: 10,
    location_id_to_slug: { hall: "hall-1" },
  },
};
const staticMap: StaticMap = {
  id: "pdf", type: "map", event: "test", label_en: "PDF", is_indoor: true,
  is_outdoor: false, order_index: 1, pois: [], floor: 0, floor_label_en: "Ground",
  area: { width: 100, height: 100 },
  tiles: { base_url: "https://example.test/tiles", large_image_url: "https://example.test/map.png", tile_size: 256, tile_file_extension: "png", size: { width: 100, height: 100 } },
};
function session(): Session {
  return {
    id: "talk", type: "session", event: "test", title: "Talk", abstract: "", description: "",
    url: "https://example.test/talk", speakers: [], enclosures: [], links: [],
    track: { id: "track", label_en: "Track" }, lang: { id: "en", label_en: "English" },
    location: { id: "hall", label_en: "Hall" },
  };
}
function configuration(): Configuration {
  return {
    event: { id: "test", type: "event", label: "Test", title: "Test", date: [moment.utc("2025-12-27"), moment.utc("2025-12-30")], locations: [], url: "https://example.test" },
    days: [], subconferences: [], sources: [], maps: [descriptor],
    options: { locationIdOrder: ["hall"], defaultColor: [0, 0, 0, 1], colorForTrack: {}, timezone: "UTC", hourOfDayChange: 0 },
  };
}

afterEach(() => jest.restoreAllMocks());

test("normalizes a multi-floor descriptor without mutating it, preserving opaque level indices", () => {
  const map = normalizeMap(descriptor, "another-event") as C3NavMap;
  expect(map.event).toBe("another-event");
  expect(map.type).toBe("map");
  expect(map.c3nav).toMatchObject({
    base_url: "https://maps.example.test/congress/",
    api_base_url: "https://maps.example.test/congress/api/v2/",
    api_headers: { "X-API-Key": "anonymous" },
    levels_url: "https://maps.example.test/congress/api/v2/mapdata/levels/",
    map_settings_url: "https://maps.example.test/congress/api/v2/map/settings/",
    location_url_template: "https://maps.example.test/congress/l/{slug}/",
    default_level_id: 10,
  });
  expect(map.c3nav.floors?.map(floor => floor.id)).toEqual([10, 20]);
  expect(map.c3nav.floors?.[1]).toMatchObject({ level_index: "0-1", on_top_of: 10 });
  expect(descriptor.c3nav.floors?.[0].id).toBe(20);
  expect(map).not.toHaveProperty("tiles");
  expect(map).not.toHaveProperty("floor");
});

test("allows discovery without a floor snapshot and explicit deployment endpoints", () => {
  const map = normalizeMap({ ...descriptor, c3nav: {
    base_url: "https://map.example.test", api_base_url: "https://api.example.test/v2",
    levels_url: "https://api.example.test/levels", map_settings_url: "https://api.example.test/settings",
    location_url_template: "https://map.example.test/location/{slug}",
  } }, "test") as C3NavMap;
  expect(map.c3nav.api_base_url).toBe("https://api.example.test/v2/");
  expect(map.c3nav.levels_url).toBe("https://api.example.test/levels");
  expect(map.c3nav.floors).toBeUndefined();
});

test.each([
  [{ base_url: "" }, /base_url/],
  [{ base_url: "javascript:alert(1)" }, /HTTP/],
  [{ base_url: "https://user:password@example.test" }, /credentials/],
  [{ api_base_url: "relative" }, /api_base_url/],
  [{ api_headers: { "X-API-Key": "private" } }, /public/],
  [{ location_url_template: "https://example.test/no-placeholder" }, /slug/],
  [{ location_id_to_slug: { hall: "" } }, /location_id_to_slug/],
  [{ floors: [descriptor.c3nav.floors?.[0], descriptor.c3nav.floors?.[0]] }, /duplicate/],
  [{ floors: [{ ...descriptor.c3nav.floors?.[0], on_top_of: 999 }] }, /on_top_of/],
  [{ floors: [{ ...descriptor.c3nav.floors?.[0], on_top_of: 20 }] }, /cyclic/],
  [{ default_level_id: 0 }, /positive/],
  [{ default_level_id: 999 }, /configured floor/],
])("rejects invalid c3nav configuration %j", (override, error) => {
  expect(() => normalizeMap({ ...descriptor, c3nav: { ...descriptor.c3nav, ...override } } as C3NavMapConfiguration, "test")).toThrow(error);
});

test("preserves legacy maps and deduplicates identical descriptors but rejects conflicts", () => {
  expect(normalizeMap(staticMap, "test")).toEqual(staticMap);
  expect(mergeMaps([staticMap, descriptor, descriptor], "test")).toHaveLength(2);
  expect(() => mergeMaps([descriptor, { ...descriptor, label_en: "Different" }], "test")).toThrow(/Conflicting map id/);
});

test("navigation is optional, encodes slugs and never duplicates existing links", () => {
  const talk = session();
  const map = normalizeMap({ ...descriptor, c3nav: { ...descriptor.c3nav, location_id_to_slug: { hall: "hall/a b" } } }, "test");
  addMapNavigationLinks([talk], [map]);
  addMapNavigationLinks([talk], [map]);
  expect(talk.links).toHaveLength(1);
  expect(talk.links[0].url).toBe("https://maps.example.test/congress/l/hall%2Fa%20b/");
  const unmapped = { ...session(), location: { id: "other", label_en: "Other" } };
  addMapNavigationLinks([unmapped, { ...session(), location: undefined }], [map]);
  expect(unmapped.links).toEqual([]);
});

async function dump(config: Configuration): Promise<ConferenceData> {
  const dir = mkdtempSync(join(tmpdir(), "ocdata-maps-"));
  try {
    const path = join(dir, "event.json");
    await dumpNormalizedConference(config, path);
    return JSON.parse(readFileSync(path, "utf8"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("event maps survive a no-source/no-session import and ocdata conversion", async () => {
  const data = await dump(configuration());
  expect(data.sessions).toEqual([]);
  expect(data.maps).toHaveLength(1);
  expect(mapsFromJson(data.maps)).toEqual(data.maps);
  expect(new EventDataStore(data).resources("maps")).toEqual(data.maps);
});

test("event-level links work with a different schedule importer and source PDF maps", async () => {
  const config = configuration();
  jest.spyOn(frab, "sourceData").mockResolvedValue([{
    event: config.event, days: [], subconferences: [], speakers: [], sessions: [session()], maps: [staticMap], pois: [],
  }]);
  const data = await dump(config);
  expect(data.maps?.map(map => map.id)).toEqual(["venue", "pdf"]);
  expect(data.sessions[0].links[0].url).toBe("https://maps.example.test/congress/l/hall-1/");
});

test("event mappings override legacy schedule mappings without removing other rooms or mutating config", async () => {
  const config = configuration();
  const source: ScheduleJSONDataSourceFormat = {
    format: "scheduleJSON", eventId: "test", scheduleURL: "https://example.test/schedule.json",
    defaultTrack: { id: "track", type: "track", event: "test", label_en: "Track", color: [0, 0, 0, 1] },
    c3nav: { baseUrl: "https://old.example.test/l/", locationIdToNavSlug: { hall: "old-hall", other: "other-room" } },
  };
  config.sources = [source];
  const spy = jest.spyOn(scheduleJSON, "sourceData").mockResolvedValue([]);
  await dump(config);
  expect((spy.mock.calls[0][3][0] as ScheduleJSONDataSourceFormat).c3nav?.locationIdToNavSlug).toEqual({ other: "other-room" });
  expect(source.c3nav?.locationIdToNavSlug.hall).toBe("old-hall");
});

test("39C3 exposes all verified main and intermediate levels alongside existing PDF maps", async () => {
  const config: Configuration = JSON.parse(readFileSync(join(__dirname, "../../../importer-config/config-39c3.json"), "utf8"));
  const pdfMaps = (config.sources[0] as ScheduleJSONDataSourceFormat).maps ?? [];
  config.sources = [];
  config.maps = [...config.maps ?? [], ...pdfMaps];
  const data = await dump(config);
  const map = data.maps?.[0] as C3NavMap;
  expect(data.maps).toHaveLength(5);
  expect(map.c3nav.floors).toHaveLength(11);
  expect(map.c3nav.floors?.filter(floor => floor.on_top_of == null)).toHaveLength(6);
  expect(map.c3nav.floors?.find(floor => floor.id === 62)?.level_index).toBe("-1");
  expect(map.c3nav.default_level_id).toBe(1);
  const app = buildApp(new Map([["39c3", new EventDataStore(data)]]));
  const server = await new Promise<http.Server>((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });
  try {
    const port = (server.address() as AddressInfo).port;
    for (const path of ["/39c3/maps", "/39c3/maps/39c3-c3nav"]) {
      const response = await new Promise<{ status?: number; body: string }>((resolve, reject) => {
        http.get({ hostname: "127.0.0.1", port, path }, res => {
          let body = "";
          res.on("data", chunk => { body += chunk; });
          res.on("end", () => resolve({ status: res.statusCode, body }));
        }).on("error", reject);
      });
      expect(response.status).toBe(200);
      expect(JSON.parse(response.body).count).toBe(path.endsWith("39c3-c3nav") ? 1 : 5);
      expect(JSON.parse(response.body).data[0].c3nav).toEqual(map.c3nav);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
