"use strict";
exports.__esModule = true;
var session_1 = require("../models/session");
var moment = require("moment-timezone");
var ISO_DAY_FORMAT = "YYYY-MM-DD";
function processData(sourceData, options) {
    var sessions = sourceData.sessions, speakers = sourceData.speakers, event = sourceData.event, days = sourceData.days, subconferences = sourceData.subconferences;
    // Extract tracks and process color
    var miniTrackMap = new Map();
    sessions.forEach(function (s) { return miniTrackMap.set(s.track.id, s.track); });
    var miniTracks = Array.from(miniTrackMap.values());
    var tracks = miniTracks.map(function (track) {
        var result = track;
        result.type = "track";
        var color = options.colorForTrack[track.id];
        if (color) {
            result.color = color;
        }
        else {
            result.color = options.defaultColor;
        }
        return result;
    });
    // Process sessions for days if scheduled
    var resultSessions = sessions.map(function (session) {
        var dateString = isoDayForSession(session, options.timezone, options.hourOfDayChange);
        session.day = days.find(function (d) { return d.date === dateString; });
        return session;
    });
    // Extract locations from sessions and process them with order
    var miniLocationMap = new Map();
    sessions.forEach(function (session) {
        var location = session.location;
        if (location)
            miniLocationMap.set(location.id, location);
    });
    var miniLocations = Array.from(miniLocationMap.values());
    var locations = miniLocations.map(function (miniLocation, index) {
        var location = miniLocation;
        location.type = "location";
        var nonStageLocationIds = options.nonStageLocationIds;
        if (nonStageLocationIds) {
            location.is_stage = !nonStageLocationIds.includes(location.id);
        }
        else {
            location.is_stage = true;
        }
        var orderIndex = options.locationIdOrder.indexOf(location.id);
        if (!orderIndex) {
            orderIndex = index + miniLocations.length;
        }
        location.order_index = orderIndex;
        return location;
    });
    // // Process cross relationships - sessions from speaker
    // const speakerMap = new Map<string,ConferenceModel.Speaker>();
    // speakers.forEach(s => speakerMap.set(s.id, s));
    // const sessionMap = new Map<string,ConferenceModel.Session>();
    // resultSessions.forEach(s => sessionMap.set(s.id, s));
    return { event: event, sessions: resultSessions, speakers: speakers, tracks: tracks, days: days, locations: locations, subconferences: subconferences };
}
exports.processData = processData;
function isoDayForSession(session, timezone, hourOfDayChange) {
    var begin = session.begin;
    if (begin === undefined ||
        session_1.stateForSession(session) !== session_1.SessionState.SCHEDULED) {
        return undefined;
    }
    var localBegin = moment(begin.tz(timezone));
    var hour = localBegin.get("h");
    if (hour < hourOfDayChange) {
        localBegin.subtract(1, "d");
    }
    return localBegin.format(ISO_DAY_FORMAT);
}
exports.isoDayForSession = isoDayForSession;
