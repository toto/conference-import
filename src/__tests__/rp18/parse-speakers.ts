import { speakersFromJson } from './../../data_sources/rp/speakers';
import * as fs from 'fs';
import * as path from 'path';

describe('Import republica basic data', () => {
  const speakerJson = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'rp18', 'rp18-speakers.json'), 'utf8');
  const parsedSpeakerJson = JSON.parse(speakerJson);
  it('Should parse some speakers', () => {
    const [ firstSpeaker ] = speakersFromJson(
      parsedSpeakerJson,
      { 
        eventId: 'rp18',
        picturePrefix: 'https://example.com/images',
        speakerLinkPrefix: 'https://example.com/speakers',
      });
    expect(firstSpeaker).toBeTruthy();
    expect(firstSpeaker.id).toBe('2329');
    expect(firstSpeaker.photo).toBe('https://example.com/images/sites/re-publica.com/files/styles/conflux_square_xs/public/media/pictures/speakerpicsmalll.jpg?itok=rxDDy2B5');
    expect(firstSpeaker.url).toBe('https://example.com/speakers/en/member/2329');
    expect(firstSpeaker.name).toBe('Geraldine de Bastion');
  });
});
