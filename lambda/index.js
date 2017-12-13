/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills
 * nodejs skill development kit.
 * This sample supports multiple lauguages. (en-US, en-GB, de-DE).
 * The Intent Schema, Custom Slots and Sample Utterances for this skill, as well
 * as testing instructions are located at https://github.com/alexa/skill-sample-nodejs-fact
 **/

'use strict';

const Alexa = require('alexa-sdk');
var https = require('https');
const APP_ID = undefined;  // TODO replace with your app ID (OPTIONAL).

const handlers = {
    'LaunchRequest': function () {
        this.emit(':ask', "Which book would you like to listen to ?");
    },
    'GetNewFactIntent': function () {
        this.emit('GetFact');
    },
    'SearchBook': function(event, handler) {

        var options = {
            parameter: 'title',
            feedname: 'audiobooks',
            query: 'moby dick',
            format: 'json'
        };

        httpsGet(options, (myResult) => {
                this.response.speak(myResult);
                this.emit(':tell', "Hello World");

            }
        );
    },
    'GetFact': function () {
        const factArr = this.t('FACTS');
        const factIndex = Math.floor(Math.random() * factArr.length);
        const randomFact = factArr[factIndex];

        // Create speech output
        const speechOutput = this.t('GET_FACT_MESSAGE') + randomFact;
        this.emit(':tellWithCard', speechOutput, this.t('SKILL_NAME'), randomFact);
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = this.t('HELP_MESSAGE');
        const reprompt = this.t('HELP_MESSAGE');
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', this.t('STOP_MESSAGE'));
    },
};


function httpsGet(options, callback) {

  var baseUrl = 'https://librivox.org/api/feed/' + options.feedname;
  var reqUrl = '/?' + options.parameter +'=^' + encodeURIComponent(options.query) + '&format=' + options.format;
  var fullUrl = baseUrl + reqUrl;

  var req = https.request(fullUrl, res => {
    res.setEncoding('utf8');
    var returnData = "";

    res.on('data', chunk => {
      returnData = returnData + chunk;
    });

    res.on('end', () => {
      returnData = JSON.parse(returnData);
      console.log(returnData);
      callback(returnData);
    });

  });
  req.end();

}

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
