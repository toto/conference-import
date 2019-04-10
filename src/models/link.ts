export interface Link {
  url: string
  type: "speaker-link" | "recording"
  title: string
  service: "web" | "twitter" | "facebook" | "github" | "youtube" | "vimeo"
  thumbnail?: string
  languages?: string[]
}