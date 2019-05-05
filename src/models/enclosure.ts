
export interface Enclosure {
  url: string
  mimetype: string
  thumbnail?: string
  title?: string
  type: "slides" | "recording" | "livestream"
  languages?: string[]
}