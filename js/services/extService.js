angular.module('thyme')
  .factory('extService', ['$q', '$http', '$rootScope', function($q, $http, $rootScope) {
    // @todo: Move out jira and zendesk stuff to two seperate servies.

    keytar = require('keytar');

    getIssues = (page) => {
      var deferred = $q.defer();

      var username = localStorage.jiraUsername;
      var password = keytar.getPassword('thyme.jiraPassword', 'jiraPassword');

      var jiraInfo = {
        url: localStorage.jiraUrl,
        credentials: btoa(username + ':' + password)
      }

      var config = {
        headers: {
          'Content-Type': 'application/json',
          "X-Atlassian-Token": "nocheck",
          'Authorization': 'Basic ' + jiraInfo.credentials
        }
      }

      pageSize = 250;

      var url = jiraInfo.url + '/rest/api/2/search?jql=' + localStorage.jiraProjectJql + ' &maxResults=' + pageSize + '&startAt=' + (page * pageSize);

      $http.get(url, config)
        .success(function(data) {
          deferred.resolve(data)
        })

      return deferred.promise;
    }

    var extService = {
      getIssues: () => {
        var deferred = $q.defer();

        // Load first batch of issues issues
        getIssues(0).then((data) => {
          var correctData = [];

          for (var i = 0; i < data.issues.length; i++) {
            correctData.push({
              name:                 data.issues[i].key + ' - ' + data.issues[i].fields.summary,
              issue_key:            data.issues[i].key,
              timeoriginalestimate: data.issues[i].fields.timeoriginalestimate,
              timeestimate:         data.issues[i].fields.timeestimate,
              timespent:            data.issues[i].fields.timespent,
            });
      	  }

          // Calculate pagecount
          pages = Math.ceil((data.total / pageSize) - 1)

          // If no more return the fetched data
          if (pages == 0) {
            deferred.resolve(correctData);
          }

          // Create array of methods to call
          promises = [];
          while(pages) {
            promises.push(getIssues(pages))
            pages--
          }

          // Execute all functions gather return values
          $q.all(promises).then((values) => {
            for (var a = 0; a < values.length; a++) {
              data = values[a]

              for (var i = 0; i < data.issues.length; i++) {
                correctData.push({
                  name:                 data.issues[i].key + ' - ' + data.issues[i].fields.summary,
                  issue_key:            data.issues[i].key,
                  timeoriginalestimate: data.issues[i].fields.timeoriginalestimate,
                  timeestimate:         data.issues[i].fields.timeestimate,
                  timespent:            data.issues[i].fields.timespent,
                });
      	      }
            }

            deferred.resolve(correctData);
          });
        });

        return deferred.promise;
      },

      logTime: function (task) {
        var deferred = $q.defer();

        var username = localStorage.jiraUsername;
        var password = keytar.getPassword('thyme.jiraPassword', 'jiraPassword');

        var jiraInfo = {
          url: localStorage.jiraUrl,
          credentials: btoa(username + ':' + password)
        }

        var config = {
          headers: {
            'Content-Type': 'application/json',
            "X-Atlassian-Token": "nocheck",
            'Authorization': 'Basic ' + jiraInfo.credentials
          }
        }

        var comment = task.task;

        if (task.description && task.description.length) {
          comment = comment + " + " + task.description;
        }

        var timesheet = {
          issue: task.issue_key,
          comment: comment,
          // Jira wants the time in seconds, we calculate the total in minutes.
          worklog: calculate_total_minutes_for_task(task) * 60,
          // startTime: '2016-11-06T13:00:00.000+0100'
          startTime: time_converter(task.created)
        }

        var url = jiraInfo.url + '/rest/api/2/issue/' + timesheet.issue + '/worklog';

        var data = JSON.stringify({
            "timeSpentSeconds": timesheet.worklog,
            "comment": timesheet.comment,
            "started": timesheet.startTime
        });

        $http.post(url, data, config)
          .success(function(data) {
            data.success = true;
            deferred.resolve(data);
          })
          .error(function(data) {
            $rootScope.$broadcast('displayError', data.message);

            data.success = false;
            deferred.resolve(data);
          });

        return deferred.promise;
      },

      getTasks: function(){
        var deferred = $q.defer();

        var username = localStorage.zendeskUsername;
        var password = keytar.getPassword('thyme.zendeskPassword', 'zendeskPassword');

        var zendeskInfo = {
          url: localStorage.zendeskUrl,
          credentials: btoa(username + ':' + password),
          userId: localStorage.zendeskUserId,
        }

        var config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + zendeskInfo.credentials
          }
        }

        var url = zendeskInfo.url + '/api/v2/users/' + zendeskInfo.userId + '/tickets/assigned.json';
        $http.get(url, config)
          .success(function(data) {

            var correctData = [];

            for (var i = 0; i < data.tickets.length; i++) {
              correctData.push({
                name: '#' + data.tickets[i].id + ' - ' + data.tickets[i].subject
              });
      	    }

            deferred.resolve(correctData);
          });

        return deferred.promise;
      }
    };

    return extService;
  }
]);
