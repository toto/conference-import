"use strict";
exports.__esModule = true;
var SessionState;
(function (SessionState) {
    SessionState[SessionState["PLANNED"] = 0] = "PLANNED";
    SessionState[SessionState["SCHEDULED"] = 1] = "SCHEDULED";
})(SessionState = exports.SessionState || (exports.SessionState = {}));
function stateForSession(session) {
    if (session.begin && session.end && session.location)
        return SessionState.SCHEDULED;
    return SessionState.PLANNED;
}
exports.stateForSession = stateForSession;
