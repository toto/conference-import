export interface MiniLocation {
  id: string
  label_en: string
  label_de?: string
}

export interface Location extends MiniLocation {
  id: string
  type: "location"
  event: string
  shortlabel_en?: string
  shortlabel_de?: string
  is_stage: boolean
  order_index: number
}