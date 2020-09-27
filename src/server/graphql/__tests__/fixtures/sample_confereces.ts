import { plainToClass } from "class-transformer";

import { Conference } from "./../../models/conference";

export const sampleConferences = [
  createConference({
    id: "1",
    name: "26C3",
    hashtag: "#26C3"
  }),
  createConference({
    id: "2",
    name: "28C3",
    hashtag: "#28C3"
  }),
  createConference({
    id: "3",
    name: "27C3",
    hashtag: "#27C3"
  }),
];

function createConference(conferenceData: Partial<Conference>): Conference {
  return plainToClass(Conference, conferenceData);
}
