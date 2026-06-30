import * as express from "express";
import * as fs from "fs";
import moment = require("moment-timezone");
import { EventDataStore, ResourceName, resourceNames } from "./eventDataStore";



interface Response<T> {
  ok: boolean;
  count: number;
  updatedAt?: string;
  data: T[];
}

function wrapInResponseData<T>(data: T[], updatedAt?: Date): Response<T> {
  return {
    ok: true,
    count: data.length,
    updatedAt: updatedAt?.toISOString(),
    data,
  };
}

function isNotModified(req: express.Request, updatedAt?: Date): boolean {
  if (!updatedAt) return false;
  const header = req.header('if-modified-since');
  if (!header) return false;
  const since = Date.parse(header);
  if (Number.isNaN(since)) return false;
  // HTTP-date has 1-second resolution; compare truncated to seconds.
  return Math.floor(updatedAt.getTime() / 1000) <= Math.floor(since / 1000);
}

function ok<T>(res: express.Response, data: T[], updatedAt?: Date) {
  if (updatedAt) res.set('Last-Modified', updatedAt.toUTCString());
  if (isNotModified(res.req, updatedAt)) return res.status(304).end();
  return res.json(wrapInResponseData(data, updatedAt));
}

function notFound(res: express.Response) {
  return res.status(404).json(wrapInResponseData([]));
}

function withUpdatedAt<T extends object>(entity: T, updatedAt: Date): T & { updatedAt: string } {
  return { ...entity, updatedAt: updatedAt.toISOString() };
}

function parseFakeLiveDate(): moment.Moment | undefined {
  if (process.env.LIVE_DEBUG === 'true') {
    return moment().add(1, 'h');
  }
  if (typeof process.env.TIME_START_DEBUG === 'string') {
    const time = moment(process.env.TIME_START_DEBUG);
    if (!time.isValid()) {
      throw new Error(`TIME_START_DEBUG set to invalid time/date: '${process.env.TIME_START_DEBUG}'`);
    }
    return time;
  }
  return undefined;
}

export function loadStores(files: string[], fakeLiveDate?: moment.Moment): Map<string, EventDataStore> {
  const stores = new Map<string, EventDataStore>();
  files.forEach(jsonPath => {
    const store = EventDataStore.eventDataFromFile(jsonPath, fakeLiveDate);
    const values = Array.from(store.sessions.values());
    console.info(`Serving ${store.event.label} (${store.event.id}, ${values.length} sessions)`);
    stores.set(store.event.id, store);
  });
  return stores;
}

const WATCH_DEBOUNCE_MS = 500;

export function watchStores(
  files: string[],
  stores: Map<string, EventDataStore>,
  fakeLiveDate?: moment.Moment,
): fs.FSWatcher[] {
  return files.map(jsonPath => {
    let timer: NodeJS.Timeout | undefined;
    const watcher = fs.watch(jsonPath, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const next = EventDataStore.eventDataFromFile(jsonPath, fakeLiveDate);
          stores.set(next.event.id, next);
          console.info(`Reloaded ${next.event.label} (${next.event.id}) from ${jsonPath}`);
        } catch (err) {
          console.error(`Failed to reload ${jsonPath}:`, err);
        }
      }, WATCH_DEBOUNCE_MS);
    });
    watcher.on('error', err => console.error(`Watcher error for ${jsonPath}:`, err));
    return watcher;
  });
}

export function buildApp(stores: Map<string, EventDataStore>): express.Application {
  const app = express();

  app.get("/events", (req, res) => {
    const storeList = Array.from(stores.values());
    const events = storeList.map(s => withUpdatedAt(s.event, s.updatedAt));
    const latest = storeList.reduce<Date | undefined>(
      (acc, s) => (!acc || s.updatedAt > acc ? s.updatedAt : acc),
      undefined,
    );
    return ok(res, events, latest);
  });

  const resourceNameSet = new Set<string>(resourceNames);

  app.get(
    "/:eventId([a-zA-Z0-9_-]+)/:resource([a-z]+)/:resourceId([a-zA-Z0-9_-]+)?",
    (req, res) => {
      console.info(`Getting ${req.path}`);

      const { eventId, resource, resourceId } = req.params as {
        eventId: string;
        resource: string;
        resourceId?: string;
      };

      if (!resourceNameSet.has(resource)) return notFound(res);
      const store = stores.get(eventId);
      if (!store) return notFound(res);

      const resourceKey = resource as ResourceName;
      if (resourceId) {
        const singularResource = store.resourceForId(resourceKey, resourceId);
        if (!singularResource) return notFound(res);
        return ok(res, [withUpdatedAt(singularResource, store.updatedAt)], store.updatedAt);
      }
      const items = store.resources(resourceKey).map(r => withUpdatedAt(r, store.updatedAt));
      return ok(res, items, store.updatedAt);
    }
  );

  return app;
}

export async function serveEvents(files: string[], server = '0.0.0.0', port = 5000) {
  const fakeLiveDate = parseFakeLiveDate();
  const stores = loadStores(files, fakeLiveDate);
  const app = buildApp(stores);
  watchStores(files, stores, fakeLiveDate);
  return new Promise((resolve) => {
    app.listen(port, server, () => {
      console.info(`API listening on port ${port}`);
      resolve(undefined);
    });
  });
}
