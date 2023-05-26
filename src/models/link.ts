export interface Link {
  url: string
  type: "speaker-link" | "recording" | "livestream" | "session-link"
  title: string
  service: "web" | "twitter" | "facebook" | "github" | "youtube" | "vimeo"
  thumbnail?: string
  languages?: string[]
}