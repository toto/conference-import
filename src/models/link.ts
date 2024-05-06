export interface Link {
  url: string
  type: "speaker-link" | "recording" | "livestream" | "session-link" | "feedback-link" | "session-alternate"
  title: string
  service: "web" | "twitter" | "facebook" | "github" | "youtube" | "vimeo" | "mastodon" | "bluesky" | "threads" | "vimeo" | "livevoice"
  thumbnail?: string
  languages?: string[]
}