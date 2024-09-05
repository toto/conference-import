export interface Link {
  url: string
  type: "speaker-link" | "recording" | "livestream" | "session-link" | "feedback-link" | "session-alternate" | "social-interaction"
  title: string
  service: "web" | "twitter" | "facebook" | "github" | "youtube" | "vimeo" | "mastodon" | "bluesky" | "threads" | "vimeo" | "livevoice" | "activityPub"
  thumbnail?: string
  languages?: string[]
}