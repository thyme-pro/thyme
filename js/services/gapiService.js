angular.module('thyme')
  .factory('gapiService', ['$q', '$http', '$rootScope', function($q, $http, $rootScope) {

    var fs = require('fs');
    var readline = require('readline');
    var google = require('googleapis');
    var googleAuth = require('google-auth-library');

    // If modifying these scopes, delete your previously saved credentials
    // at ~/.credentials/calendar-nodejs-quickstart.json
    var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
    var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
        process.env.USERPROFILE) + '/.credentials/';
    var TOKEN_PATH = TOKEN_DIR + 'thyme-google.json';


    var credentials = {};

    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
      }
      // Authorize a client with the loaded credentials, then call the
      // Google Calendar API.
      credentials = JSON.parse(content);
    });

    function authorize(callback) {
      var clientSecret = credentials.installed.client_secret;
      var clientId = credentials.installed.client_id;
      var redirectUrl = credentials.installed.redirect_uris[0];
      var auth = new googleAuth();
      var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
          console.log('getNewToken');
          getNewToken(oauth2Client, callback);
        } else {
          console.log('load credentials');
          oauth2Client.credentials = JSON.parse(token);
          callback(oauth2Client);
        }
      });
    }

    function listEvents(auth) {
      var calendar = google.calendar('v3');
      calendar.events.list({
        auth: auth,
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        timeMax: (new Date(new Date().getTime() + 24 * 60 * 60 * 1000)).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
      }, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          return;
        }
        var events = response.items;
        if (events.length == 0) {
          console.log('No upcoming events found.');
        } else {
          console.log('Todays events:');
          for (var i = 0; i < events.length; i++) {
            var event = events[i];
            var start = event.start.dateTime || event.start.date;
            var description = event.description || '';
            console.log('%s - %s - %s', start, event.summary, description);
          }
        }
      });
    }

    function getNewToken(oauth2Client, callback) {
      var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
      });

      nw.Window.open(authUrl, {}, function(new_win) {

        var interval = setInterval(function() {
          var title = new_win.window.document.getElementsByTagName('title')[0].text;

          if (title.indexOf('Success code=') != -1) {
            new_win.close(true);

            var code = title.replace('Success code=', '');

            oauth2Client.getToken(code, function(err, token) {
              if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
              }
              oauth2Client.credentials = token;
              storeToken(token);
              callback(oauth2Client);
            });

            clearInterval(interval);
          }

        }, 10);

      });

      console.log('Authorize this app by visiting this url: ', authUrl);

      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
          if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
          }
          oauth2Client.credentials = token;
          storeToken(token);
          callback(oauth2Client);
        });
      });
    }

    function storeToken(token) {
      try {
        fs.mkdirSync(TOKEN_DIR);
      } catch (err) {
        if (err.code != 'EEXIST') {
          throw err;
        }
      }
      fs.writeFile(TOKEN_PATH, JSON.stringify(token));
      console.log('Token stored to ' + TOKEN_PATH);
    }

    var gapiService = {
      init: function() {
        // Load client secrets from a local file.
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
          if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
          }
          // Authorize a client with the loaded credentials, then call the
          // Google Calendar API.
          authorize(JSON.parse(content), listEvents);
        });
      },

      authorize: function(callback) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        getNewToken(oauth2Client);
        return
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, function(err, token) {
          if (err) {
            console.log('getNewToken');
            getNewToken(oauth2Client, callback);
          } else {
            console.log('load credentials');
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth3Client);
          }
        });
      },

      revoke: function() {
        fs.unlink(TOKEN_PATH, function(err) {
          if (err) {
            console.log('Error deleting token: ' + err);
          }
        });
      },

      getEvents: function() {
        var deferred = $q.defer();
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
          if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
          }
          // Authorize a client with the loaded credentials, then call the
          // Google Calendar API.
          var credentials = JSON.parse(content);
          var clientSecret = credentials.installed.client_secret;
          var clientId = credentials.installed.client_id;
          var redirectUrl = credentials.installed.redirect_uris[0];
          var auth = new googleAuth();
          var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

          // Check if we have previously stored a token.
          fs.readFile(TOKEN_PATH, function(err, token) {
            if (err) {
              console.log('no valid token');
            } else {
              console.log('load credentials');
              oauth2Client.credentials = JSON.parse(token);

              var calendar = google.calendar('v3');
              console.log((new Date(new XDate().clearTime())).toISOString());

              calendar.events.list({
                auth: oauth2Client,
                calendarId: 'primary',
                timeMin: (new Date(new XDate().clearTime())).toISOString(),
                timeMax: (new Date(new XDate().setHours(23).setMinutes(59))).toISOString(),
                maxResults: 10,
                singleEvents: true,
                orderBy: 'startTime'
              }, function(err, response) {
                if (err) {
                  console.log('The API returned an error: ' + err);
                  return;
                }

                var events = response.items;
                deferred.resolve(events);
              });
            }
          });
        });
        return deferred.promise;
      }
    }

    return gapiService;
  }
]);
