interface MapTileConfig {
  base_url: string
  large_image_url: string
  tile_size: number
  tile_file_extension: "png" | "jpg" | "jpeg"
  size: MapSize
}

interface MapSize {
  width: number
  height: number
}

interface MapBase {
  id: string
  type: "map"
  event: string
  label_de?: string
  label_en: string
  is_outdoor: boolean
  is_indoor: boolean
  order_index: number
  pois: string[]
}

/** An omitted provider identifies a legacy static map. */
export interface StaticMap extends MapBase {
  provider?: "static"
  floor_label_de?: string
  floor_label_en: string
  floor: number
  area: MapSize
  tiles: MapTileConfig
  map_pdf_url?: string
}

/** IDs belong to the c3nav instance; they are not floor numbers. */
export interface C3NavFloor {
  id: number
  slug: string
  level_index: string
  label_en: string
  label_de?: string
  order_index: number
  /** Null/absent for a main level, otherwise the underlying level's ID. */
  on_top_of?: number | null
}

export interface C3NavConnection {
  base_url: string
  api_base_url: string
  /** Public guest access only. Never publish a private API key here. */
  api_headers: { "X-API-Key": "anonymous" }
  levels_url: string
  map_settings_url: string
  location_url_template: string
  /** Optional metadata snapshot; levels_url remains authoritative. */
  floors?: C3NavFloor[]
  default_level_id?: number
  location_id_to_slug?: Record<string, string>
}

/** A complete, potentially multi-floor venue, rendered by c3nav. */
export interface C3NavMap extends MapBase {
  provider: "c3nav"
  c3nav: C3NavConnection
}

export type Map = StaticMap | C3NavMap;

export type C3NavMapConfiguration = Omit<C3NavMap, "event" | "type" | "c3nav"> & {
  event?: string
  type?: "map"
  c3nav: Pick<C3NavConnection, "base_url"> & Partial<Omit<C3NavConnection, "base_url">>
};

export type MapConfiguration = StaticMap | C3NavMapConfiguration;
