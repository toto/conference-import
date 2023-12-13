export interface Link {
  url: string
  type: "speaker-link" | "recording" | "livestream" | "session-link" | "feedback-link"
  title: string
  service: "web" | "twitter" | "facebook" | "github" | "youtube" | "vimeo" | "mastodon" | "bluesky" | "threads" | "vimeo"
  thumbnail?: string
  languages?: string[]
}