'use strict';

const Alexa = require('alexa-sdk');


module.exports = audioEventHandlers;

function getToken() {
    return this.event.request.token;
}

function getIndex() {
    var tokenValue = parseInt(this.event.request.token);
    return this.attributes['playOrder'].indexOf(tokenValue);
}

function getOffsetInMilliseconds() {
    return this.event.request.offsetInMilliseconds;
}
