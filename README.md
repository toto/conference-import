# Conference Import

Imports conference data from different sources into the unified [ocdata](/ocdata) format. Also provides a express based server to serve the unified files from the filesystem/memory. 

The idea is to avoid a database alltogether since only static data is served. 

## TODO

- Let webserver serve all compatible json files from single directory
- Make the webserver responde to a unix-signal to reload it's files
