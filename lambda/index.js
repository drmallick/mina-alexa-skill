/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';

const Alexa = require('alexa-sdk');
const APP_ID = 'amzn1.ask.skill.e167b868-fdc9-4289-bf7b-e372b8728b85';
var xml2js = require('xml2js-es6-promise');
var rp = require('request-promise');


const states = {
  CONFIRMBOOK : '_CONFIRMBOOK',
  SEARCHBOOK: '_SEARCHBOOK',
  PLAY_MODE: '_PLAY_MODE'
};

const handlers = {
    'NewSession': function () {
      this.handler.state = states.SEARCHBOOK;
      this.emitWithState('NewSession');
    },

  'LaunchRequest': function () {
    this.handler.state = '';
    delete this.attributes['STATE'];
    this.response.listen('What book would you like to listen to ?');
    this.emit(':responseReady');
  }
};

const searchHandlers = Alexa.CreateStateHandler(states.SEARCHBOOK, {

    'NewSession': function(event, handler) {
      this.emit(':ask', "What would you like to do ?");
    },

  'SearchBook': function(event, handler) {
    var slots = this.event.request.intent.slots;

    if(slots.bookName.value) {

      var options = {
        parameter: 'title',
        feedname: 'audiobooks',
        query: slots.bookName.value,
        format: 'json'
      };

      var output = "Finding audiobooks for the book " + slots.bookName.value;
      // this.emit(':ask', output);

      var url = buildUrl(options);
      httpGet(url).then((data) => {
        var results = buildSearchResults(data);
        this.attributes['searchResults'] = results;
        this.attributes['confirmIndex'] = 0;
        this.handler.state = states.CONFIRMBOOK;
        this.emit(':ask', 'Did you mean ' + results[0].title + ' by ' +
                            results[0].authors.join(', '));
        this.emit(':saveState');
      });
    } else if(slots.authorName.value) {
    }
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

  'Unhandled': function() { 
    // console.log(this.event);
    // console.log(this.event.request.intent.slots);
    this.response.speak('Sorry, I didn\'t get that.').listen('Try again');
    this.emit(':responseReady');
  }
});

const playModeHandlers = Alexa.CreateStateHandler(states.PLAY_MODE, {
  'NewSession': function() {
    this.emit('NewSession');
  },

  'LaunchRequest' : function () {
    /*
     *  Session resumed in PLAY_MODE STATE.
     *  If playback had finished during last session :
     *      Give welcome message.
     *      Change state to START_STATE to restrict user inputs.
     *  Else :
     *      Ask user if he/she wants to resume from last position.
     *      Change state to RESUME_DECISION_MODE
     */
    var message;
    var reprompt;
    if (this.attributes['playbackFinished']) {
      this.handler.state = constants.states.START_MODE;
      message = "Welcome to the Birthday Hotline. You can say, play the audio, to begin";
      reprompt = 'You can say, play the audio, to begin.';
    } else {
      this.handler.state = constants.states.RESUME_DECISION_MODE;
      message = 'You were listening to ' + this.attributes['recordings'][this.attributes['playOrder'][this.attributes['index']]].title +
        ' Would you like to resume?';
      reprompt = 'You can say yes to resume or no to play from the top.';
    }

    this.response.speak(message).listen(reprompt);
    this.emit(':responseReady');
  },
  'PlayAudio' : function () { controller.play.call(this) },
  'AMAZON.NextIntent' : function () { controller.playNext.call(this) },
  'AMAZON.PreviousIntent' : function () { controller.playPrevious.call(this) },
  'AMAZON.PauseIntent' : function () { controller.stop.call(this) },
  'AMAZON.StopIntent' : function () { controller.stop.call(this) },
  'AMAZON.CancelIntent' : function () { controller.stop.call(this) },
  'AMAZON.ResumeIntent' : function () { controller.play.call(this) },
  'AMAZON.LoopOnIntent' : function () { controller.loopOn.call(this) },
  'AMAZON.LoopOffIntent' : function () { controller.loopOff.call(this) },
  'AMAZON.ShuffleOnIntent' : function () { controller.shuffleOn.call(this) },
  'AMAZON.ShuffleOffIntent' : function () { controller.shuffleOff.call(this) },
  'AMAZON.StartOverIntent' : function () { controller.startOver.call(this) },
  'AMAZON.HelpIntent' : function () {
    // This will called while audio is playing and a user says "ask <invocation_name> for help"
    var message = "You are listening to the Birthday Hotline. You can say, Next or Previous to navigate through the playlist. " +
          'At any time, you can say Pause to pause the audio and Resume to resume.';
    this.response.speak(message).listen(message);
    this.emit(':responseReady');
  },
  'SessionEndedRequest' : function () {
    // No session ended logic
  },
  'Unhandled' : function () {
    var message = 'Sorry, I could not understand. You can say, Next or Previous to navigate through the playlist.';
    this.response.speak(message).listen(message);
    this.emit(':responseReady');
  }
});


const confirmHandlers = Alexa.CreateStateHandler(states.CONFIRMBOOK, {
  'NewSession': function() {
    this.emit('NewSession');
  },

  'AMAZON.YesIntent': function() {

    var index = this.attributes['confirmIndex'];
    var book = this.attributes['searchResults'][index];

    httpGet(book.url).then((data) => {
      var bookData = buildBookData(data);
      this.attributes['books'][]
      this.attributes['currentBook'] = bookData;
      var firstTitle = bookData.chapters[0].title;
      var firstURL= bookData.chapters[0].url.replace(/http/, 'https');
      this.response.speak('Playing ' + firstTitle);
      this.response.audioPlayerPlay('REPLACE_ALL', firstURL, firstTitle, null, 0);
      this.emit(':responseReady');
    }).catch((error) => {
      console.log(error);
    });

  },

  'AMAZON.NoIntent': function() {

  },

  'Unhandled': function() { 
    // console.log(this.event);
    // console.log(this.event.request.intent.slots);
    this.response.speak('Sorry, I didn\'t get that.').listen('Try again');
    this.emit(':responseReady');
  }

});


const audioEventHandlers = Alexa.CreateStateHandler(states.PLAY_MODE, {
    'PlaybackStarted' : function () {
        /*
         * AudioPlayer.PlaybackStarted Directive received.
         * Confirming that requested audio file began playing.
         * Storing details in dynamoDB using attributes.
         */
        this.emit(':saveState', true);
    },
    'PlaybackFinished' : function () {
        /*
         * AudioPlayer.PlaybackFinished Directive received.
         * Confirming audio file completed playing.
         * Storing details in dynamoDB using attributes.
         */
        this.attributes['playbackFinished'] = true;
        this.attributes['enqueuedToken'] = false;
        this.emit(':saveState', true);
    },
    'PlaybackStopped' : function () {
        /*
         * AudioPlayer.PlaybackStopped Directive received.
         * Confirming that audio file stopped playing.
         * Storing details in dynamoDB using attributes.
         */
        this.attributes['token'] = getToken.call(this);
        this.attributes['index'] = getIndex.call(this);
        this.attributes['offsetInMilliseconds'] = getOffsetInMilliseconds.call(this);
        this.emit(':saveState', true);
    },
    'PlaybackNearlyFinished' : function () {
        /*
         * AudioPlayer.PlaybackNearlyFinished Directive received.
         * Using this opportunity to enqueue the next audio
         * Storing details in dynamoDB using attributes.
         * Enqueuing the next audio file.
         */
    },

    'PlaybackFailed' : function () {
        //  AudioPlayer.PlaybackNearlyFinished Directive received. Logging the error.
        console.log("Playback Failed : %j", this.event.request.error);
        this.context.succeed(true);
    }
});

var xmlTransform = (body, response, resolveWithFullResponse) => {
  return xml2js(body).then((result) => {
    return result;
  });
};

function httpGet(url) {
  var options = {
    uri : url
  };

  if(url.includes('rss')) {
    options['transform'] = xmlTransform;
  }

  if(url.includes('json')) {
    options['json'] = true;
  }


  console.log(url);
  return rp(options);
}

function buildSearchResults(jsonObject) {
  var result = [];
  jsonObject.books.forEach((book) => {
    var data = {};
    data['title'] = book.title;
    data['description'] = book.description;
    data['url'] = book.url_rss;
    data['authors'] = [];
    data['id'] = book.id;
    book.authors.forEach((author) => {
      data['authors'].push(author.first_name + ' ' + author.last_name);
    });
    result.push(data);
  });

  // console.log(result);
  return result;
}

function buildUrl(options) {
  var baseUrl = 'https://librivox.org/api/feed/' + options.feedname;
  var reqUrl = '/?' + options.parameter +'=^' +
        encodeURIComponent(options.query) +
        '&format=' + options.format;
  var url = baseUrl + reqUrl;
  console.log("here1 " + url);
  return url;

}


function buildBookData(jsonObject) {
  var result = {};
  var chapters = [];
  result['title'] = jsonObject.rss.channel[0].title;
  result['url'] = jsonObject.rss.channel[0].link;
  result['description'] = jsonObject.rss.channel[0].description;
  result['currentTrack'] = {
    'title' : '',
    'url': '',
    'offset': ''};

  jsonObject.rss.channel[0].item.forEach((item) => {
    chapters.push({
      'title': item.title[0],
      'url': item.link[0]
    });
  });

  result['chapters'] = chapters;
  // console.log(result);
  return result;
}

// httpGet('https://librivox.org/rss/253').then((data) => {
//   console.log(data);
// });

// httpGet('https://librivox.org/api/feed/audiobooks?title=^charles&format=json')
//   .then((data) => {
//     buildSearchResults(data);
//   });



exports.handler = function (event, context) {
  const alexa = Alexa.handler(event, context);
  alexa.APP_ID = APP_ID;
  alexa.dynamoDBTableName = 'mina';
  alexa.registerHandlers(handlers,
                         searchHandlers,
                         confirmHandlers,
                        playModeHandlers);
  alexa.execute();
};
