# Conference Import

Imports conference data from different sources into the unified [ocdata](https://github.com/ocdata/re-data) format. Also provides a express based server to serve the unified files from the filesystem/memory. 

The idea is to avoid a database alltogether since only static data is served. 

## Usage

### Import data for a specific conference

1. Create a config file (see `importer-config` for examples)
2. Build the code `./node_modules/typescript/bin/tsc`
3. Run the importer (e.g. for 35C3) `CONF=35c3 node lib/index.js --import --config importer-config/config-$CONF.json --out out-$CONF.json` 

### Serve the API data

Given the `out.json` that was generated before run

`node lib/index.js --serve --pid your.pid -- *.json`

This will serve all data from the JSON files in the current directory. The server will give a bit of output.

### Debug / Development options

- Set `LIVE_DEBUG=true` to fake the conference to be currently live

## TODO

- Make the webserver responde to a unix-signal to reload it's files (currently it's just killed and restarted)
