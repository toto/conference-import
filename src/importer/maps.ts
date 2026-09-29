import { isDeepStrictEqual } from "util";
import { URL } from "url";
import { Map as ConferenceMap, MapConfiguration, C3NavMap } from "../models/map";
import { Session } from "../models";

function httpUrl(value: string, field: string, directory = false): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be an absolute HTTP(S) URL`);
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error(`${field} must be an HTTP(S) URL without credentials or a fragment`);
  }
  if (directory) {
    if (url.search) throw new Error(`${field} must not contain a query`);
    url.pathname = url.pathname.replace(/\/*$/, "/");
  }
  return url.toString();
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function levelId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/** Normalize descriptors locally: importing an event never needs a c3nav request. */
export function normalizeMap(map: MapConfiguration, eventId: string): ConferenceMap {
  if (!map || !nonempty(map.id) || !/^[a-zA-Z0-9_-]+$/.test(map.id)) {
    throw new Error("Map id must contain only letters, digits, underscores or hyphens");
  }
  const prefix = `Map '${map.id}'`;
  if (map.provider === undefined || map.provider === "static") {
    return { ...map, event: eventId };
  }
  if (map.provider !== "c3nav") throw new Error(`${prefix}: unsupported provider`);
  if (!nonempty(map.label_en) || typeof map.is_indoor !== "boolean" ||
      typeof map.is_outdoor !== "boolean" || !Number.isFinite(map.order_index) ||
      !Array.isArray(map.pois) || !map.pois.every(nonempty)) {
    throw new Error(`${prefix}: label_en, indoor/outdoor flags, order_index and pois are required`);
  }
  const config = map.c3nav;
  if (!config || !nonempty(config.base_url)) throw new Error(`${prefix}: c3nav.base_url is required`);
  const base_url = httpUrl(config.base_url, `${prefix} base_url`, true);
  const api_base_url = httpUrl(config.api_base_url ?? new URL("api/v2/", base_url).toString(), `${prefix} api_base_url`, true);
  const template = config.location_url_template ?? `${base_url}l/{slug}/`;
  if (typeof template !== "string" || template.split("{slug}").length !== 2 || /[{}]/.test(template.replace("{slug}", ""))) {
    throw new Error(`${prefix}: location_url_template must contain exactly one {slug}`);
  }
  httpUrl(template.replace("{slug}", "example"), `${prefix} location_url_template`);
  if (config.api_headers !== undefined && !isDeepStrictEqual(config.api_headers, { "X-API-Key": "anonymous" })) {
    throw new Error(`${prefix}: only the public X-API-Key: anonymous header may be published`);
  }
  if (config.location_id_to_slug !== undefined && (!config.location_id_to_slug ||
      typeof config.location_id_to_slug !== "object" || Array.isArray(config.location_id_to_slug) ||
      !Object.entries(config.location_id_to_slug).every(([id, slug]) => nonempty(id) && nonempty(slug)))) {
    throw new Error(`${prefix}: location_id_to_slug must map location IDs to nonempty slugs`);
  }
  if (config.default_level_id !== undefined && !levelId(config.default_level_id)) {
    throw new Error(`${prefix}: default_level_id must be a positive c3nav level ID`);
  }
  const floors = config.floors;
  if (floors !== undefined) {
    if (!Array.isArray(floors)) throw new Error(`${prefix}: floors must be an array`);
    const ids = new Set<number>();
    const slugs = new Set<string>();
    for (const floor of floors) {
      if (!floor || !levelId(floor.id) || !nonempty(floor.slug) || !nonempty(floor.level_index) ||
          !nonempty(floor.label_en) || !Number.isFinite(floor.order_index)) {
        throw new Error(`${prefix}: each floor needs an id, slug, level_index, label_en and order_index`);
      }
      if (ids.has(floor.id) || slugs.has(floor.slug)) throw new Error(`${prefix}: duplicate floor ID or slug`);
      ids.add(floor.id);
      slugs.add(floor.slug);
    }
    for (const floor of floors) {
      const visited = new Set<number>([floor.id]);
      let parent = floor.on_top_of;
      while (parent !== undefined && parent !== null) {
        if (!levelId(parent) || !ids.has(parent) || visited.has(parent)) {
          throw new Error(`${prefix}: invalid or cyclic on_top_of reference for floor ${floor.id}`);
        }
        visited.add(parent);
        parent = floors.find(candidate => candidate.id === parent)?.on_top_of;
      }
    }
    if (config.default_level_id !== undefined && !ids.has(config.default_level_id)) {
      throw new Error(`${prefix}: default_level_id must reference a configured floor`);
    }
  }
  return {
    ...map, type: "map", event: eventId,
    c3nav: {
      ...config, base_url, api_base_url,
      api_headers: { "X-API-Key": "anonymous" as const },
      levels_url: httpUrl(config.levels_url ?? new URL("mapdata/levels/", api_base_url).toString(), `${prefix} levels_url`),
      map_settings_url: httpUrl(config.map_settings_url ?? new URL("map/settings/", api_base_url).toString(), `${prefix} map_settings_url`),
      location_url_template: template,
      ...(floors === undefined ? {} : { floors: floors.map(floor => ({ ...floor })).sort((a, b) => a.order_index - b.order_index) }),
    },
  };
}

/** Identical repeated descriptors are harmless; conflicting IDs must not silently overwrite. */
export function mergeMaps(maps: MapConfiguration[], eventId: string): ConferenceMap[] {
  const result = new Map<string, ConferenceMap>();
  for (const input of maps) {
    const map = normalizeMap(input, eventId);
    const existing = result.get(map.id);
    if (existing && !isDeepStrictEqual(existing, map)) throw new Error(`Conflicting map id '${map.id}'`);
    result.set(map.id, map);
  }
  return Array.from(result.values());
}

export function addMapNavigationLinks(sessions: Session[], maps: ConferenceMap[]): void {
  const c3navMaps = maps.filter((map): map is C3NavMap => map.provider === "c3nav");
  for (const session of sessions) {
    if (!session.location) continue;
    for (const map of c3navMaps) {
      const mapping = map.c3nav.location_id_to_slug;
      if (!mapping || !Object.prototype.hasOwnProperty.call(mapping, session.location.id)) continue;
      const slug = mapping[session.location.id];
      const url = map.c3nav.location_url_template.replace("{slug}", encodeURIComponent(slug));
      if (session.links.some(link => link.url === url)) continue;
      session.links.unshift({ url, type: "session-link", title: `C3Nav: ${session.location.label_en}`, service: "web" });
    }
  }
}
