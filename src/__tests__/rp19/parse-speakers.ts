import { speakersFromJson } from './../../data_sources/rp19/speakers';
import * as fs from 'fs';
import * as path from 'path';

describe('Import republica basic data', () => {
  const speakerJson = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'rp19', 'main-speakers.json'), 'utf8');
  const parsedSpeakerJson = JSON.parse(speakerJson);
  it('Should parse some speakers', () => {
    const [ firstSpeaker ] = speakersFromJson(
      parsedSpeakerJson,
      { 
        eventId: 'rp19',
        picturePrefix: 'https://example.com/images',
        speakerLinkPrefix: 'https://example.com/speakers',
      });
    expect(firstSpeaker).toBeTruthy();
    expect(firstSpeaker.id).toBe('19252');
    expect(firstSpeaker.photo).toBe('https://example.com/images/sites/re-publica.com/files/styles/conflux_square_xs/public/pictures/d36d706f-fa92-43b6-94ed-eb7281ea0d6f.jpg?itok=kUPvs-cR');
    expect(firstSpeaker.url).toBe('https://example.com/speakers/en/user/19252');
    expect(firstSpeaker.name).toBe('Georg Fischer');
  });
});