import * as path from "path";
import * as express from "express";
import { EventDataStore } from "./eventDataStore";

const PORT = 5000;
const app = express();

interface Response<T> {
  ok: boolean;
  count: number;
  data: T[];
}

function wrapInResponseData<T>(data: T[]): Response<T> {
  return { ok: true, count: data.length, data };
}

const files: string[] = [];

if (process.argv.length <= 2) {
  const [argv0, argv1] = process.argv;
  console.error(`Usage: ${argv0} ${argv1} file0 file1.json...`);
  process.exit(-1);
}

for (let i = 2; i < process.argv.length; i++) {
  files.push(path.normalize(process.argv[i]));
}

const stores: Map<string, EventDataStore> = new Map();

files.forEach(jsonPath => {
  const store = EventDataStore.eventDataFromFile(jsonPath);
  if (!store) return;
  const values = Array.from(store.sessions.values());
  console.info(`Serving ${store.event.label} (${store.event.id}, ${values.length} sessions)`);
  stores.set(store.event.id, store);
});

app.get("/events", (req, res) => {
  const events = Array.from(stores.values()).map(s => s.event);
  return res.json(wrapInResponseData(events));
});

// Unimplemented
["pois", "maps"].forEach(resource => {
  const regexp = new RegExp(`/[a-z09A-Z]+\/${resource}`);
  app.get(regexp, (req, res) => {
    console.info(`Getting ${req.path} (unimplemnted)`);
    return res.status(404).json(wrapInResponseData([]));
  });
});

const resourceName = [
  "sessions",
  "speakers",
  "days",
  "tracks",
  "locations",
  "subconferences"
];
resourceName.forEach(resource => {
  const detailPath = new RegExp(
    `\/([a-z0-9A-Z_\-]+)\/${resource}\/([a-zA-Z0-9_\-]+)`
  );
  const allPath = new RegExp(
    `\/([a-z0-9A-Z_\-]+)\/${resource}`
  );
  
  app.get([detailPath, allPath], (req, res) => {
    console.info(`Getting ${req.path}`);

    const eventId = req.params[0];
    if (!eventId) return res.status(404).json(wrapInResponseData([]));

    const store = stores.get(eventId);
    if (!store) return res.status(404).json(wrapInResponseData([]));

    const resourceId = req.params[1];
    if (resourceId) {
      const singularResource = store.resourceForId(resource as any, resourceId);
      if (!singularResource) {
        return res.status(404).json(wrapInResponseData([]));
      }
      return res.json(wrapInResponseData([singularResource]));
    } else {
      const resources = store.resources(resource as any);
      return res.json(wrapInResponseData(resources));
    }


    
  });
});

app.listen(PORT, "localhost", () =>
  console.info(`API listening on port ${PORT}`)
);
