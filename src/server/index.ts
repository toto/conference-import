import * as express from "express";
import { EventDataStore } from "./eventDataStore";



interface Response<T> {
  ok: boolean;
  count: number;
  data: T[];
}

function wrapInResponseData<T>(data: T[]): Response<T> {
  return { ok: true, count: data.length, data };
}

export async function serveEvents(files: string[], server='localhost', port=5000) {
  return new Promise((resolve) => {
    const app = express();
    
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
    ["pois"].forEach(resource => {
      const regexp = new RegExp(`/[a-z0-9A-Z]+\/${resource}`);
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
      "subconferences",
      "maps"
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
    
    app.listen(port, "localhost", () => {
      console.info(`API listening on port ${port}`)
      resolve();
    });  
  });  
}

