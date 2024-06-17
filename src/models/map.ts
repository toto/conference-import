
interface MapTileConfig {
  base_url: string
  large_image_url: string
  tile_size: number,
  tile_file_extension: "png" | "jpg" | "jpeg"
  size: MapSize
}

interface MapSize {
  width: number
  height: number
}

export interface Map {
  id: string
  type: "map"
  event: string
  label_de?: string
	label_en: string
	floor_label_de?: string
	floor_label_en: string
	is_outdoor: boolean
  is_indoor: boolean
  floor: number,
	order_index: number
	area: MapSize
  tiles: MapTileConfig
  pois: string[]
  map_pdf_url?: string
}