# TODO

## Refactor server

- [x] 1. Split `serveEvents` into `loadStores(files)`, `buildApp(stores)`, and a thin `serveEvents(files, host, port)` orchestrator.
- [x] 2. Move `LIVE_DEBUG` / `TIME_START_DEBUG` parsing out of the per-file loop — compute `fakeLiveDate` once.
- [x] 3. Replace the two per-resource regexes with a single typed route: `/:eventId/:resource(sessions|speakers|...)/:resourceId?`, validated against a `const` tuple.
- [x] 4. Centralize the 404 + response envelope into helpers (`ok(res, data)`, `notFound(res)`) so `updatedAt` can be injected in one place.
- [x] 5. Drop the `keyof EventResources` / `as never` indirection — index a typed `Record<ResourceKey, Map<string, …>>` or expose a single `get(resource, id?)`.
- [x] 6. Inject `updatedAt` from filesystem mtime: stat the JSON file once at load, attach `store.updatedAt`, mix into envelope and per-entity detail responses (response layer only, not the model).
- [x] 7. Honour `If-Modified-Since` / set `Last-Modified` header so clients and CDNs can 304.
- [x] 8. Watch the JSON file with debounced `fs.watch` and rebuild the `EventDataStore` in place so re-imports take effect without restart and `Last-Modified` stays accurate.
- [x] 9. Make `eventDataFromFile` fail loudly — throw with the file path instead of returning `null` and being silently skipped by the caller.
