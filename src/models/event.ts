import * as moment from 'moment-timezone';


export interface Event {
  type: "event"
  id: string
  label: string
  title: string
  date: [moment.Moment, moment.Moment]
  url: string
  hashtag?: string
  locations: EventLocation[]
}

export interface EventLocation {
  label: string
  timezone: string
  coords: [number, number]
}
