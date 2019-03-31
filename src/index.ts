import * as process from 'process';
import { Configuration, dumpNormalizedConference } from './importer/dumper';
import { readFileSync } from 'fs';

const configFile = process.argv[process.argv.length - 2]
const exportDir = process.argv[process.argv.length - 1]
const config = JSON.parse(readFileSync(configFile, 'utf8')) as Configuration;

dumpNormalizedConference(config, exportDir).then(() => { 
  console.info('Export to', exportDir);
}).catch(error => console.error(error));
