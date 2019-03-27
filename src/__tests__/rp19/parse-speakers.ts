import { speakersFromJson } from './../../data_sources/rp19/speakers';
import * as fs from 'fs';
import * as path from 'path';

describe('Import republica basic data', () => {
  const speakerJson = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'rp19', 'main-speakers.json'), 'utf8');
  const parsedSpeakerJson = JSON.parse(speakerJson);
  it('Should parse some speakers', () => {
    const [ firstSpeaker ] = speakersFromJson(parsedSpeakerJson, {eventId: 'rp19'});
    expect(firstSpeaker).toBeTruthy();
  });
});