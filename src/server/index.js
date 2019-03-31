"use strict";
exports.__esModule = true;
var fs = require("fs");
var express = require("express");
var PORT = 5000;
var app = express();
function wrapInResponseData(data) {
    return { ok: true, count: data.length, data: data };
}
var data = JSON.parse(fs.readFileSync('/Users/toto/Desktop/foo.json', 'utf8'));
app.get('/events', function (req, res) {
    return res.json(wrapInResponseData([data.event]));
});
app.listen(PORT, function () { return console.info("API listening on port " + PORT); });
