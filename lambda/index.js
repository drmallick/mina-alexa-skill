/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/

'use strict';

const Alexa = require('alexa-sdk');
const APP_ID = 'amzn1.ask.skill.e167b868-fdc9-4289-bf7b-e372b8728b85';
var xml2js = require('xml2js-es6-promise');
var rp = require('request-promise');


const states = {
  CONFIRMBOOK : '_CONFIRMBOOK',
  SEARCHBOOK: '_SEARCHBOOK'
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


const playHandlers = Alexa.CreateStateHandler(states.CONFIRMBOOK, {
  'NewSession': function() {
    this.emit('NewSession');
  },

  'AMAZON.YesIntent': function() {
    var index = this.attributes['confirmIndex'];
    var book = this.attributes['searchResults'][index];
    httpGet(book.url).then((data) => {
      var bookData = buildBookData(data);
      this.attributes['currentBook'] = bookData;
      var firstTitle = bookData.chapters[0].title;
      var firstURL= bookData.chapters[0].url.replace(/http/, 'https');
      console.log(firstTitle);
      this.response.speak('Playing ' + firstTitle);
      this.response.audioPlayerPlay('REPLACE_ALL', firstURL, firstTitle, null, 0);
      this.emit(':responseReady');
    }).catch((error) => {
      console.log(error);
    });

  },
  'Unhandled': function() { 
    // console.log(this.event);
    // console.log(this.event.request.intent.slots);
    this.response.speak('Sorry, I didn\'t get that.').listen('Try again');
    this.emit(':responseReady');
  }

});
// var options = {
//   feedname: "audiobooks",
//   parameter: "title",
//   query: "pride and prejudice",
//   format: "json"
// }

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
                        playHandlers);
  alexa.execute();
};
