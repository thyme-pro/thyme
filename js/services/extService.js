angular.module('thyme')
  .factory('extService', ['$q', '$http', '$rootScope', function ($q, $http, $rootScope) {
    // @todo: Move out jira and zendesk stuff to two seperate servies.

    const pageSize = 250;

    const getIssues = (page) => {
      let deferred = $q.defer();

      let username = localStorage.jiraUsername;
      let password = localStorage.jiraPassword;

      let jiraInfo = {
        url: localStorage.jiraUrl,
        credentials: btoa(username + ':' + password)
      };

      let config = {
        headers: {
          'Content-Type': 'application/json',
          'X-Atlassian-Token': 'nocheck',
          'Authorization': 'Basic ' + jiraInfo.credentials
        }
      };

      let url = jiraInfo.url + '/rest/api/2/search?jql=' + localStorage.jiraProjectJql + ' &maxResults=' + pageSize + '&startAt=' + (page * pageSize);

      $http.get(url, config)
        .then(function (data) {
          deferred.resolve(data);
        }, function (error) {
          console.log(error)
        });

      return deferred.promise;
    };

    let extService = {
      getWorklogs: () => {
        let deferred = $q.defer();

        let username = localStorage.jiraUsername;
        let password = localStorage.jiraPassword;
        let jiraInfo = {
          url: localStorage.jiraUrl,
          credentials: btoa(username + ':' + password)
        };
        let url = jiraInfo.url + '/rest/api/2/getWorklogs';

        let config = {
          headers: {
            'Content-Type': 'application/json',
            'X-Atlassian-Token': 'nocheck',
            'Authorization': 'Basic ' + jiraInfo.credentials
          }
        };

        $http.get(url, config)
          .then(function (data) {
            deferred.resolve(data);
          }, function (error) {
            console.log(error)
          });

        return deferred.promise;
      },
      getIssues: () => {
        let deferred = $q.defer();

        // Load first batch of issues issues
        getIssues(0).then((result) => {
          let correctData = [];

          let data = result.data

          for (let i = 0; i < data.issues.length; i++) {
            correctData.push({
              name: data.issues[i].fields.summary,
              issue_key: data.issues[i].key + '',
              task_id: data.issues[i].key + '',
              timeoriginalestimate: data.issues[i].fields.timeoriginalestimate,
              timeestimate: data.issues[i].fields.timeestimate,
              timespent: data.issues[i].fields.timespent,
            });
          }

          // Calculate pagecount
          let pages = Math.ceil((data.total / pageSize) - 1);

          // If no more return the fetched data
          if (pages == 0) {
            deferred.resolve(correctData);
          }

          // Create array of methods to call
          let promises = [];
          while (pages) {
            promises.push(getIssues(pages));
            pages--;
          }

          // Execute all functions gather return values
          $q.all(promises).then((values) => {
            for (let a = 0; a < values.length; a++) {
              data = values[a];

              for (let i = 0; i < data.issues.length; i++) {
                correctData.push({
                  name: data.issues[i].fields.summary,
                  issue_key: data.issues[i].key + '',
                  task_id: data.issues[i].key + '',
                  timeoriginalestimate: data.issues[i].fields.timeoriginalestimate,
                  timeestimate: data.issues[i].fields.timeestimate,
                  timespent: data.issues[i].fields.timespent,
                });
              }
            }

            deferred.resolve(correctData);
          });
        });

        return deferred.promise;
      },

      logTime: function (worklog) {
        let deferred = $q.defer();
        let username = localStorage.jiraUsername;
        let password = localStorage.jiraPassword;

        let jiraInfo = {
          url: localStorage.jiraUrl,
          credentials: btoa(username + ':' + password)
        };

        let config = {
          headers: {
            'Content-Type': 'application/json',
            'X-Atlassian-Token': 'nocheck',
            'Authorization': 'Basic ' + jiraInfo.credentials
          }
        };


        let timesheet = {
          taskId: worklog.task_id,
          comment: worklog.description,
          // Jira wants the time in seconds, we calculate the total in minutes.
          worklog: timeHelper.calculateTotalForWorklog(worklog) * 60,
          // startTime: '2016-11-06T13:00:00.000+0100'
          startTime: timeHelper.timeConverter(worklog.created)
        };

        let url = jiraInfo.url + '/rest/api/2/issue/' + timesheet.taskId + '/worklog';

        let data = JSON.stringify({
          'timeSpentSeconds': timesheet.worklog,
          'comment': timesheet.comment,
          'started': timesheet.startTime
        });

        $http.post(url, data, config)
          .then(function (data) {
            data.success = true;
            deferred.resolve(data);
          }, function (data) {
            $rootScope.$broadcast('displayError', data.message);

            data.success = false;
            deferred.resolve(data);
          });

        return deferred.promise;
      },

      getTickets() {
        let deferred = $q.defer();

        let username = localStorage.zendeskUsername;
        let password = localStorage.zendeskPassword;

        let zendeskInfo = {
          url: localStorage.zendeskUrl,
          credentials: btoa(username + ':' + password),
          userId: localStorage.zendeskUserId,
        };

        let config = {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + zendeskInfo.credentials
          }
        };

        let url = zendeskInfo.url + '/api/v2/users/' + zendeskInfo.userId + '/tickets/assigned.json';

        $http.get(url, config)
          .then(function (result) {
            let data = result.data

            let correctData = [];

            for (let i = 0; i < data.tickets.length; i++) {
              correctData.push({
                name: '#' + data.tickets[i].id + ' - ' + data.tickets[i].subject
              });
            }

            deferred.resolve(correctData);
          }, function (error) {
            console.log(error)
          });

        return deferred.promise;
      }
    };

    return extService;
  }
  ]);
