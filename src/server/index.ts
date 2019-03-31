import * as fs from 'fs';
import * as express from 'express';
import { ConferenceData } from '../importer/importer';

const PORT = 5000;
const app = express();

interface Response<T> {
  ok: boolean
  count: number
  data: T[]
}

function wrapInResponseData<T>(data: T[]): Response<T> {
  return { ok: true, count: data.length, data }
}


const data = JSON.parse(fs.readFileSync('/Users/toto/Desktop/foo.json', 'utf8')) as ConferenceData;

app.get('/events', (req, res) => {
  return res.json(wrapInResponseData([data.event]));
});

["sessions", "speakers", "days", "tracks", "locations", "subconferences", "pois", "maps"].forEach(resource => {
  const anyData = data as any;
  const path = `/${data.event.id}/${resource}`;
  
  app.get(path, (req, res) => {
    console.info(`Getting ${req.path}`);
    if (anyData[resource]) {
      return res.json(wrapInResponseData(anyData[resource] as any[]));
    } else {
      return res.json(wrapInResponseData([]));
    }
  });

  const detailPath = new RegExp(`/${data.event.id}/${resource}/([a-zA-Z0-9_\-]+)`);
  app.get(detailPath, (req, res) => {
    console.info(`Getting ${req.path}`);

    const resourceId = req.params[0];
    if (!resourceId) {
      return res.status(404).json(wrapInResponseData([]));
    }
    const resourceData = anyData[resource] as {id: string}[];
    if (!resourceData) {
      return res.status(404).json(wrapInResponseData([]));
    }

    const singularResource = resourceData.find(r => r.id === resourceId);
    if (!singularResource) {
      return res.status(404).json(wrapInResponseData([]));
    }

    return res.json(wrapInResponseData([singularResource]));
  });
});

app.listen(PORT, 'localhost', () => console.info(`API listening on port ${PORT}`));