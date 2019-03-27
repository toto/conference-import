import { Speaker } from './../../models/speaker';
import * as utils from './utils';


interface Options {
  speakerPostProcessing?(speaker: Speaker): Speaker | null
  eventId: string
}

export function speakersFromJson(json: any, options: Options): Speaker[] {
  if (!Array.isArray(json)) return [];

  const speakers: Speaker[] = json.map((item) => {
    return {
      id: item.uid,
      name: utils.dehtml(item.name),
      type: "speaker",
      event: options.eventId,
    }
  });
  
  return speakers;
}