export interface MiniTrack {
  id: string
  label_en: string
  label_de?: string
}

export interface Track extends MiniTrack {
  type: "track"
  color: [number, number, number, number]
}
