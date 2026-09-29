# Conference Import

Imports conference data from different sources into the unified [ocdata](https://github.com/ocdata/re-data) format. Also provides a express based server to serve the unified files from the filesystem/memory. 

The idea is to avoid a database alltogether since only static data is served. 

## Usage

### Import data for a specific conference

1. Create a config file (see `importer-config` for examples)
2. Install the dependencies `npm install`
3. Build the code `npm run build`
4. Run the importer (e.g. for 35C3) `node lib/index.js --import --config importer-config/config-35c3.json --out out-35c3.json`

### Serve the API data

Given the `out.json` that was generated before run

`node lib/index.js --serve --pid your.pid -- *.json`

This will serve all data from the JSON files in the current directory. The server will give a bit of output.

### Debug / Development options

- Set `LIVE_DEBUG=true` to fake the conference to be currently live
- Alternatively set `TIME_START_DEBUG=<date>` where `<date>` is any format that [MomentJS](https://momentjs.com) can parse. This will be the start point of the first session.

## TODO

- Make the webserver responde to a unix-signal to reload it's files (currently it's just killed and restarted)

## c3nav indoor maps

Add a top-level `maps` array to any event configuration, independently of its
schedule sources. For example:

```json
{
  "maps": [{
    "id": "my-event-c3nav",
    "provider": "c3nav",
    "label_en": "Interactive venue map",
    "is_indoor": true,
    "is_outdoor": false,
    "order_index": 0,
    "pois": [],
    "c3nav": {
      "base_url": "https://39c3.c3nav.de/",
      "location_id_to_slug": { "my-room-id": "hall-1" }
    }
  }]
}
```

The importer supplies `type`, the event ID, API base URL (`api/v2/`), guest API
header, levels endpoint (`mapdata/levels/`), settings endpoint (`map/settings/`),
and location URL template (`l/{slug}/`) relative to the configured base URL.
Each endpoint can be overridden for a different deployment. Base URLs are
normalized with trailing slashes. Importing these descriptors does not contact
c3nav and works with no schedule sources or sessions.

One c3nav map covers all floors. Optionally configure a `c3nav.floors` snapshot
and `default_level_id`; apps can also discover current floors from `levels_url`.
Floor IDs are c3nav IDs, not storey numbers, and intermediate levels carry an
`on_top_of` reference. See [the map API contract](doc/api.md#c3nav-maps) for the
complete fields and client behavior, and [39C3's configuration](importer-config/config-39c3.json)
for a verified multi-floor example with PDF fallbacks.

`location_id_to_slug` is exposed to apps and adds room navigation links to
sessions from any schedule format. For scheduleJSON it takes precedence over
legacy `sources[].c3nav` mappings for the same location; other legacy mappings
continue to work. Existing identical links are not duplicated. Existing
source-level maps remain supported. Identical duplicate map IDs are coalesced;
conflicting descriptors fail the import rather than silently replacing a map.
