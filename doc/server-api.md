# Conference Data API — Server Specification

This document specifies the HTTP API served by this repository (`node lib/index.js --serve`).
It's written so that another developer, or an agent, can build a **drop-in compatible
server** that existing clients (mobile apps, the `ocdata` importer source) can talk to
without changes.

- Machine-readable contract: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1)
- Reference implementation: [`src/server/index.ts`](../src/server/index.ts),
  [`src/server/eventDataStore.ts`](../src/server/eventDataStore.ts)
- Data model source of truth: [`src/models/`](../src/models)
- Field-level background and client guidance (legacy, partly outdated paths):
  [`api.md`](./api.md)

Where this document and `api.md` disagree about HTTP behavior, this document describes
what the server actually does. See [Differences from the legacy `api.md`](#differences-from-the-legacy-apimd).

The keywords MUST, SHOULD and MAY follow [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

---

## 1. Overview

The API is **read-only**: it only serves static JSON. There is no database, no
authentication and no write endpoints. A server instance serves one or more **events**
(conferences, such as `39c3` or `rp25`). Each event has eight resource collections:

| Collection | Item type | Description |
| --- | --- | --- |
| `sessions` | `Session` | Talks, workshops, etc. |
| `speakers` | `Speaker` | People presenting sessions |
| `days` | `Day` | Calendar days of the event |
| `tracks` | `Track` | Topic categories, with colors |
| `locations` | `Location` | Rooms and stages |
| `subconferences` | `Subconference` | Embedded sub-events (e.g. *Tincon* at re:publica) |
| `maps` | `Map` | Venue maps (static tiles/PDF or c3nav) |
| `pois` | `POI` | Points of interest on maps |

---

## 2. Endpoints and routing

### 2.1 URL grammar

```
GET /events
GET /{eventId}/{collection}
GET /{eventId}/{collection}/{id}
```

- `eventId` and `id` MUST match `^[a-zA-Z0-9_-]+$`. IDs with other characters (such as
  `.`, `:`, `%`-encoded bytes or spaces) aren't routable. A compatible server returns 404
  for them, so data producers SHOULD only use IDs from this alphabet.
- `collection` is one of the eight names in the table above (lowercase).
- Event collections sit **directly** under the event ID. There is **no** `/events/{eventId}/…`
  prefix, even though the legacy documentation shows one.
- A trailing slash is tolerated (`/39c3/sessions/` is the same as `/39c3/sessions`).
- Only `GET` and `HEAD` are supported. Other methods get a 404.
- **Query parameters are ignored.** There is no pagination, filtering, sorting or
  `last_modified` filter. Every list response contains the complete collection.

### 2.2 Deployment prefix

The reference server mounts routes at `/`. Production deployments put it behind a
reverse proxy that adds a prefix. The public instance is:

```
https://api.conference.systems/api/events
https://api.conference.systems/api/39c3/sessions
```

Clients treat `https://host/prefix` as the base URL and append the paths above. The
`ocdata` importer source (`src/dataSources/ocdata`) does exactly that with
`baseUrl = https://api.conference.systems/api/<eventId>`.

### 2.3 Endpoint list

| Method | Path | 200 `data` contains |
| --- | --- | --- |
| GET | `/events` | every `Event` served |
| GET | `/{eventId}/sessions` | every `Session` of the event |
| GET | `/{eventId}/sessions/{id}` | exactly one `Session` |
| GET | `/{eventId}/speakers` | every `Speaker` |
| GET | `/{eventId}/speakers/{id}` | exactly one `Speaker` |
| GET | `/{eventId}/days` | every `Day` |
| GET | `/{eventId}/days/{id}` | exactly one `Day` |
| GET | `/{eventId}/tracks` | every `Track` |
| GET | `/{eventId}/tracks/{id}` | exactly one `Track` |
| GET | `/{eventId}/locations` | every `Location` |
| GET | `/{eventId}/locations/{id}` | exactly one `Location` |
| GET | `/{eventId}/subconferences` | every `Subconference` |
| GET | `/{eventId}/subconferences/{id}` | exactly one `Subconference` |
| GET | `/{eventId}/maps` | every `Map` |
| GET | `/{eventId}/maps/{id}` | exactly one `Map` |
| GET | `/{eventId}/pois` | every `POI` |
| GET | `/{eventId}/pois/{id}` | exactly one `POI` |

There's no single-event endpoint (`/events/{id}`). Clients filter `/events` instead.

---

## 3. Response envelope

Every JSON response, whether it's a list, a single item or a 404, uses the same envelope:

```json
{
  "ok": true,
  "count": 2,
  "updatedAt": "2026-10-25T13:54:24.811Z",
  "data": [ { "...": "..." }, { "...": "..." } ]
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `ok` | boolean | Always `true`, including on 404 responses. |
| `count` | integer | MUST equal `data.length`. It's **not** a total for pagination. |
| `updatedAt` | string (ISO 8601, UTC, ms) | Present on 200 responses, omitted on 404s. See [§5](#5-caching-and-freshness). |
| `data` | array | Always an array. A single-item request returns an array with **exactly one** element. |

The server also adds `updatedAt` **to every object inside `data`**, with the same value as
the envelope. It's injected at response time and isn't part of the stored data.

Content type: `application/json; charset=utf-8`. Bodies are UTF-8 JSON. Clients MUST NOT
depend on whitespace or key order.

---

## 4. Status codes and errors

| Situation | Status | Body |
| --- | --- | --- |
| Success | `200` | Envelope with data |
| `If-Modified-Since` / `If-None-Match` matches | `304` | Empty |
| Unknown `eventId` | `404` | `{"ok":true,"count":0,"data":[]}` |
| Unknown collection name (e.g. `/39c3/foo`, `/39c3/Sessions`; names are case-sensitive) | `404` | `{"ok":true,"count":0,"data":[]}` |
| Unknown `id` in a known collection | `404` | `{"ok":true,"count":0,"data":[]}` |
| Path doesn't match the URL grammar (e.g. `/`, `/39c3`, `/events/39c3/sessions`) | `404` | Not specified. The reference server returns an HTML page. |

Notes for implementers:

- The 404 body says `ok: true` and has **no** `updatedAt`. Keep this exact shape. Some
  clients only check `count`/`data`, and changing `ok` to `false` isn't known to be safe.
- An event that exists but has an empty collection returns **200** with `count: 0`, not a 404.
- There's no error object and no 4xx other than 404, so there are no 5xx bodies to emulate.

---

## 5. Caching and freshness

Each event has one **update timestamp**: the instant its data set last changed. The
reference server uses the modification time of the event's JSON file and hot-reloads the
file when it changes (debounced by 500 ms). Every object of the event shares this timestamp.

A compatible server MUST:

1. Put the timestamp in the envelope's `updatedAt` and in each `data[]` object's `updatedAt`
   as ISO 8601 UTC with milliseconds (`2026-10-25T13:54:24.811Z`, i.e. JavaScript
   `Date.prototype.toISOString()`).
2. Send the same instant as an HTTP-date in `Last-Modified` on every 200 response
   (`Sun, 25 Oct 2026 13:54:24 GMT`).
3. Answer `304 Not Modified` with an empty body when the request has
   `If-Modified-Since` and `floor(updatedAt / 1s) <= floor(If-Modified-Since / 1s)`.
   An unparsable header is ignored.
4. For `/events`, use the **latest** update timestamp across all served events for the
   envelope and `Last-Modified`. Each event object carries its own event's `updatedAt`.

A compatible server SHOULD send an `ETag` and honor `If-None-Match` with a `304`. The
reference server gets a weak ETag from Express (`W/"<len>-<hash>"`). Clients MUST NOT
depend on the ETag format.

When a server updates data, the change MUST be atomic per event. A client must never see
sessions from the new import with speakers from the old one.

---

## 6. Data model

All schemas are defined in [`openapi.yaml`](./openapi.yaml) under `components.schemas`.
This section explains semantics that the schemas can't express.

### 6.1 General conventions

- **Extensibility.** Objects MAY contain fields that aren't documented here. Clients MUST
  ignore unknown fields, and servers MUST pass through extra fields from their data source
  unchanged. For example, embedded `track` objects often carry `color` and `type`.
- **Absent and `null`.** Optional fields are usually **omitted** rather than set to `null`.
  Treat `null` and absent the same way. Exceptions where `null` is a documented value:
  `Speaker.url` and `C3NavFloor.on_top_of`.
- **Empty strings.** Required text fields (`abstract`, `description`) MAY be `""`.
- **Localization.** Localized fields use a language suffix: `label_en`, `label_de`,
  `description_en` and so on. `_en` is always present and other languages are optional.
  Clients fall back to `_en`. Non-suffixed `label` (on `Event` and `Subconference`) isn't
  localized.
- **`type` discriminator.** Every top-level resource carries a constant `type`: `event`,
  `session`, `speaker`, `day`, `track`, `location`, `subconference`, `map` or `poi`.
- **`event` back-reference.** Every resource except `Event` carries `event: <eventId>`.
- **IDs** are opaque strings, unique per collection within one event. They aren't
  globally unique. The same ID MAY appear in two events or two collections.
- **Ordering.** Lists are returned in the order of the underlying data file, and there's
  no server-side sorting. Clients sort by `begin`, `order_index` or `date` as appropriate.
  A server MUST keep the order stable between requests for unchanged data.
- **Duplicate IDs.** If the source data contains two objects with the same ID in one
  collection, the reference server serves the **last** one at the position of the
  **first** one (JavaScript `Map` semantics). Data producers SHOULD avoid duplicates.
- **Text format.** `description_format` / `biography_format` is `plain` or `markdown`.
  Absent means `plain`.

### 6.2 Time

- `Event.date` and `Day.date` are **calendar dates** (`YYYY-MM-DD`) in the event's local
  time zone (`Event.locations[0].timezone`, an IANA name).
- `Session.begin` and `Session.end` are RFC 3339 timestamps. The reference importer emits
  UTC (`2025-12-27T09:30:00.000Z`), but offsets (`+01:00`) are valid and MUST be accepted
  by clients.
- `Session.duration` is in **minutes**. It's optional, so derive it from `end - begin`
  when it's missing.
- Unscheduled sessions omit `begin`, `end`, `day` and often `location`.

**Day assignment.** `Session.day` is a full copy of one of the event's `Day` objects. A
data producer computes it like this:

```
local = begin converted to the event time zone
if local.hour < hourOfDayChange:  # e.g. 6, so a 02:00 talk belongs to the previous day
    local = local - 1 day
session.day = the Day whose date == local.date, or absent if none matches
```

### 6.3 Relationships

Resources link to each other by **embedding a small reference object**, not by bare ID:

```
Session.track            -> MiniTrack     {id, label_en, label_de?, ...}   -> /tracks/{id}
Session.location         -> MiniLocation  {id, label_en, label_de?}        -> /locations/{id}
Session.day              -> Day           (full object)                    -> /days/{id}
Session.subconference    -> Subconference (full object)                    -> /subconferences/{id}
Session.speakers[]       -> MiniSpeaker   {id, name}                       -> /speakers/{id}
Session.related_sessions -> MiniSession   {id, title}                      -> /sessions/{id}
Speaker.sessions[]       -> MiniSession   {id, title}                      -> /sessions/{id}
Location.point_of_interest -> {id, label_en, ...}                          -> /pois/{id}
POI.location             -> MiniLocation                                   -> /locations/{id}
POI.positions[].identifier -> map id                                       -> /maps/{id}
Map.pois[]               -> POI id (string)                                -> /pois/{id}
```

Referential integrity is **best effort**. A reference MAY point to an ID that isn't in the
target collection, so clients MUST handle that. The embedded fields are enough to render a
list row without a second request.

`Session.format`, `Session.level`, `Session.lang` and `Session.translated_langs[]` are
`{id, label_en, label_de?}` objects with no collection endpoint. `lang.id` is an ISO 639-1
code.

### 6.4 Resource summaries

Required fields are in **bold**. For types and the full list, see `openapi.yaml`.

**Event**: **`type`**, **`id`**, **`label`** (short, e.g. `39C3`), **`title`**,
**`date`** (`[first, last]`, both inclusive), **`url`**, **`locations[]`**
(`{label, timezone, coords: [lat, lon]}`), `hashtag` (without `#`).

**Session**: **`type`**, **`id`**, **`event`**, **`title`**, **`abstract`**,
**`description`**, **`url`**, **`track`**, **`lang`**, **`speakers[]`**,
**`enclosures[]`**, **`links[]`**, `subtitle`, `description_format`, `begin`, `end`,
`duration`, `day`, `location`, `format`, `level`, `translated_langs[]`, `subconference`,
`will_be_recorded`, `cancelled` (absent means `false`), `related_sessions[]`.

**Speaker**: **`type`** (`speaker`), **`id`**, **`event`**, **`name`**, **`url`**
(string or `null`), **`links[]`**, **`sessions[]`**, `photo`, `organization`,
`position`, `biography`, `biography_format`.

**Day**: **`type`**, **`id`**, **`event`**, **`date`**, `label_en`, `label_de`.
Day IDs are usually the date itself, such as `2025-12-27`.

**Track**: **`type`**, **`id`**, **`event`**, **`label_en`**, `label_de`, `color`,
`darkColor`. Colors are `[r, g, b, a]` with RGB in 0–255 and alpha in 0–1. Use `color`
when `darkColor` is missing.

**Location**: **`type`**, **`id`**, **`event`**, **`label_en`**, **`is_stage`**,
**`order_index`** (lower comes first), `label_de`, `shortlabel_en`/`shortlabel_de`
(≤3 characters), `point_of_interest`.

**Subconference**: **`type`**, **`id`**, **`label`**, **`event`**.

**Link** (in sessions, speakers and POIs): **`url`**, **`type`**, **`title`**,
**`service`**, `thumbnail`, `languages[]`.

- `type` is one of `speaker-link`, `recording`, `livestream`, `session-link`,
  `feedback-link`, `session-alternate` or `social-interaction`.
- `service` is one of `web`, `twitter`, `facebook`, `github`, `youtube`, `vimeo`,
  `mastodon`, `bluesky`, `threads`, `livevoice` or `activityPub`.
- Clients MUST tolerate unknown values. Treat an unknown `service` as `web`.

**Enclosure** (session media): **`url`**, **`mimetype`**, **`type`** (`slides`,
`recording` or `livestream`), `title`, `thumbnail`, `languages[]`. Livestreams are
typically HLS (`application/x-mpegurl`) and recordings are typically `video/mp4`.

**POI**: **`type`**, **`id`**, **`event`**, **`label_en`**, **`category`**,
**`positions[]`** (`{identifier: mapId, x, y}`, in pixels of the map image),
**`links[]`**, `geo_position` (`{lat, long}`), `location`, `description_en`/`_de`,
`hidden` (default `false`), `priority` (default `0`), `beacons[]` (`{uuid, major, minor}`).
`category` is one of `session-location`, `workshop-location`, `service`, `info`, `safety`,
`community`, `food`, `entertainment`, `organisation`, `restroom`, `elevator`, `escalator`,
`shopping` or `other`.

### 6.5 Maps

`Map` is a tagged union discriminated by `provider`:

| `provider` | Variant | Key fields |
| --- | --- | --- |
| absent or `"static"` | `StaticMap` | `floor`, `floor_label_*`, `area {width,height}` (meters), `tiles`, `map_pdf_url` |
| `"c3nav"` | `C3NavMap` | `c3nav` connection object (one map covers all floors) |

Both variants share **`type`** (`map`), **`id`**, **`event`**, **`label_en`**,
**`is_indoor`**, **`is_outdoor`**, **`order_index`** and **`pois[]`**.

- `tiles` is an OpenSeadragon/Deep-Zoom descriptor (`base_url`, `large_image_url`,
  `tile_size`, `tile_file_extension`, `size`). **In practice it can be an empty object
  `{}`** when only a PDF is available through `map_pdf_url`. For example, 39C3 ships its
  floor plans this way.
- The `c3nav` object always contains all six connection fields: `base_url`, `api_base_url`,
  `api_headers` (only ever `{"X-API-Key": "anonymous"}`), `levels_url`, `map_settings_url`
  and `location_url_template`. It can also contain `floors[]`, `default_level_id` and
  `location_id_to_slug`. Client behavior is described in [`api.md#c3nav-maps`](./api.md#c3nav-maps).
- Clients MUST skip maps whose `provider` they don't know. Servers MAY add new providers.

---

## 7. Implementing a compatible server

### 7.1 Minimal design

The reference server is deliberately simple, and a compatible server can be too:

1. **Load** one JSON document per event. The importer writes this format (see below).
2. **Index** each collection by `id` in insertion order.
3. **Route** `GET /events` and `GET /:eventId/:collection/:id?` as in §2.
4. **Wrap** results in the envelope from §3 and add `updatedAt` to each item.
5. **Cache headers** as in §5.

### 7.2 Event data file (importer output)

`node lib/index.js --import --config <config.json> --out <file.json>` writes one file per
event with this shape (`ConferenceData` in `src/importer/importer.ts`):

```json
{
  "event":          { "type": "event", "id": "39c3", "...": "..." },
  "days":           [ /* Day */ ],
  "subconferences": [ /* Subconference */ ],
  "sessions":       [ /* Session */ ],
  "speakers":       [ /* Speaker */ ],
  "tracks":         [ /* Track */ ],
  "locations":      [ /* Location */ ],
  "maps":           [ /* Map */ ],
  "pois":           [ /* POI */ ]
}
```

`maps` and `pois` MAY be missing, so treat them as empty. The objects already have their
final served shape. The server only adds `updatedAt`, so serving this file *is* the API.
A compatible server can use any storage, as long as the output matches.

### 7.3 Pseudocode

```text
on GET /events:
    stores = all loaded events
    latest = max(store.updatedAt for store in stores)
    return ok([ {...store.event, updatedAt: store.updatedAt} for store in stores ], latest)

on GET /{eventId}/{collection}/{id?}:
    if collection not in COLLECTIONS or eventId not in stores: return 404 EMPTY
    store = stores[eventId]
    if id:
        item = store[collection].get(id) or return 404 EMPTY
        return ok([ {...item, updatedAt: store.updatedAt} ], store.updatedAt)
    return ok([ {...i, updatedAt: store.updatedAt} for i in store[collection] ], store.updatedAt)

ok(data, ts):
    set Last-Modified = httpDate(ts)
    if If-Modified-Since parses and seconds(ts) <= seconds(header): return 304
    return 200 { ok: true, count: len(data), updatedAt: iso(ts), data }

EMPTY = { ok: true, count: 0, data: [] }
```

### 7.4 Conformance checklist

- [ ] `GET /events` returns every event, each with `type: "event"` and `updatedAt`.
- [ ] Routes are `/{eventId}/{collection}[/{id}]` with no `/events/` prefix, and a
      trailing slash is accepted.
- [ ] All eight collection names are supported, even when a collection is empty (200 with
      `count: 0`).
- [ ] Single-item responses wrap the item in a one-element `data` array.
- [ ] `count == data.length`, and query parameters don't change the result.
- [ ] Unknown event, collection or ID gives `404` with `{"ok":true,"count":0,"data":[]}`.
- [ ] `updatedAt` appears on the envelope and on every item, in ISO 8601 UTC with ms.
- [ ] `Last-Modified` is sent, and `If-Modified-Since` gives `304` at 1-second
      granularity.
- [ ] Unknown fields from the data are passed through untouched.
- [ ] Response bodies validate against [`openapi.yaml`](./openapi.yaml).

Quick smoke test against a running server:

```bash
BASE=http://localhost:5000
curl -s $BASE/events | jq '.ok, .count, .data[0].id'
curl -s $BASE/39c3/sessions | jq '.count == (.data | length)'
curl -s -o /dev/null -w '%{http_code}\n' $BASE/39c3/sessions/does-not-exist   # 404
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "If-Modified-Since: $(curl -sI $BASE/39c3/days | sed -n 's/^Last-Modified: //Ip' | tr -d '\r')" \
  $BASE/39c3/days                                                              # 304
```

### 7.5 Not part of the contract

These are features of the reference implementation only:

- The `LIVE_DEBUG` and `TIME_START_DEBUG` environment variables. They shift session times
  so an old event looks live, and replace livestream URLs with a test stream.
- The listening address and port (`0.0.0.0:5000`), the PID file and file watching.
- The `X-Powered-By` header and the HTML body of unmatched-route 404s.

---

## Differences from the legacy `api.md`

[`api.md`](./api.md) describes an earlier version of this API and is still the best source
for field-level intent. Its HTTP section no longer matches the server:

| Legacy `api.md` says | Actual behavior |
| --- | --- |
| Paths are `/events/<event-id>/sessions` | Paths are `/<event-id>/sessions` |
| `ok` shows whether the request succeeded | `ok` is always `true`, and errors are signalled by the 404 status |
| `count` is the total number of objects, for pagination | `count` is `data.length`, and there's no pagination |
| `?start=&count=` paginate | Ignored |
| `last_modified` per object (Unix seconds) and a `?last_modified=` filter | Not served. Use `updatedAt` (ISO 8601) and `If-Modified-Since` instead. |
| `Event.begin` / `Event.end` | `Event.date: [begin, end]` |
| `/formats`, `/levels`, `/languages` collections | Not served. These only exist embedded in sessions. |
| `GET /events/<event-id>/pois/<poi-id>` etc. | `GET /<event-id>/pois/<poi-id>` |
