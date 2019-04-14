import * as process from 'process';
import { Configuration, dumpNormalizedConference } from './importer/dumper';
import { serveEvents } from './server';
import { readFileSync, writeFileSync } from 'fs';
import * as minimist from 'minimist';
import * as path from "path";

enum COMMAND {
  IMPORT = 'import',
  SERVE = 'serve'
}

function printHelp() {
  console.log("Help:");
  console.log("  -h|--help\tprint this help");
}

const argv = minimist(process.argv, {'--': true, alias: {pid: 'p', help: 'h'}});
if (argv['help'] || argv._.length === 0) {
  printHelp();
  process.exit(0);
}

if (argv[COMMAND.IMPORT]) {
  const configFile = process.argv[argv._.length - 2]
  const exportDir = process.argv[argv._.length - 1]
  const config = JSON.parse(readFileSync(configFile, 'utf8')) as Configuration;
  
  dumpNormalizedConference(config, exportDir).then(() => { 
    console.info('Exported to', exportDir);
  }).catch(error => console.error(error));  

} else if (argv[COMMAND.SERVE] && argv["--"]) {
  if (argv.pid) {
    writeFileSync(argv.pid, `${process.pid}`, {flag: 'w'});
    console.info(`Writing PID file to ${argv.pid}`);
  }

  const paths = argv["--"].filter(arg => arg !== COMMAND.SERVE);
  const files = paths.map(p => path.normalize(p));
  serveEvents(files).then(() => {
    console.log('Serving…');
  }).catch(error => console.error(error));
} else {
  printHelp();
}

    
