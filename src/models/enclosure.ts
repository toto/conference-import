
export interface Enclosure {
  url: string
  mimetype: string
  thumbnail: string
  type: "slides" | "recording" | "livestream"
  languages?: string[]
}