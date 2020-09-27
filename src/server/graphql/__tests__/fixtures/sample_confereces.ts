import { plainToClass } from "class-transformer";

import { Conference } from "./../../models/conference";

export const sampleConferences = [
  createConference({
    id: "1",
    name: "26th Chaos Communication Congress",
    hashtag: "#26C3",
    venues: [
      {id: "1", name: "BCC", position: {lat: 23, lng: 42}, timeZone: "Europe/Berlin"}
    ]
  }),
  createConference({
    id: "2",
    name: "30th Chaos Communication Congress",
    hashtag: "#30C3",
    venues: [
      {id: "2", name: "Congress Center Hamburg", position: {lat: 53.561583, lng: 9.985683}, timeZone: "Europe/Berlin"}
    ]
  }),
  createConference({
    id: "3",
    name: "36th Chaos Communication Congress",
    hashtag: "#36C3",
    venues: [
      {id: "3", name: "Messe Leipzig", position: {lat: 51.396667, lng: 12.402778}, timeZone: "Europe/Berlin"}
    ]
  }),
];

function createConference(conferenceData: Partial<Conference>): Conference {
  return plainToClass(Conference, conferenceData);
}
