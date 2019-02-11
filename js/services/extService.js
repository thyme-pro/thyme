angular.module('thyme')
  .factory('extService', ['$q', '$http', '$rootScope', function ($q, $http, $rootScope) {
    const getIssues = () => {
      let url = `${localStorage.dashboardUrl}api/tracker/tasks/?api_token=${localStorage.internalApiToken}`;

      return fetch(url, {headers: helper.basicAuthHeaders})
        .then(res => res.json())
    };

    let extService = {
      getIssues: () => {
        let deferred = $q.defer();

        // Load first batch of issues issues
        getIssues().then((data) => {
          let correctData = [];

          for (let i = 0; i < data.issues.length; i++) {
            correctData.push({
              name: data.issues[i].fields.summary,
              issue_key: data.issues[i].key + '',
              task_id: data.issues[i].key + '',
              budget: data.issues[i].fields.budget,
              timespent: data.issues[i].fields.timespent,
            });
          }

          deferred.resolve(correctData);
        })

        return deferred.promise;
      },

      logTime: function (worklog) {
        let deferred = $q.defer();

        let timesheet = {
          taskId: worklog.task_id,
          comment: worklog.description,
          // Jira wants the time in seconds, we calculate the total in minutes.
          worklog: timeHelper.calculateTotalForWorklog(worklog) * 60,
          // startTime: '2016-11-06T13:00:00.000+0100'
          startTime: timeHelper.timeConverter(worklog.created)
        };

        let url = `${localStorage.dashboardUrl}api/tracker/worklog/${timesheet.taskId}/add?api_token=${localStorage.internalApiToken}`;

        let body = JSON.stringify({
          'timeSpentSeconds': timesheet.worklog,
          'comment': timesheet.comment,
          'started': timesheet.startTime
        });

        let config = {
          headers: {}
        };

        fetch(url, {
          method: 'POST',
          cache: 'no-cache',
          headers: helper.basicAuthHeaders,
          body: body
        })
          .then(res => {
            if (!res.ok) {
              throw res
            }
            return res.json()
          })
          .then(data => {
            console.log(data)
            data.success = true;
            deferred.resolve(data);
          })
          .catch(err => {
            err.json()
              .then(errMsg => {
                ipc.send('display-error', errMsg);
              })

            deferred.resolve({success: false});
          });

        return deferred.promise;
      },

      getTickets (sanitize = true) {
        let deferred = $q.defer();

        const username = localStorage.zendeskUsername
        const password = localStorage.zendeskPassword

        let headers = new Headers();
        headers.set('Authorization', 'Basic ' + btoa(username + ':' + password));

        let url = `${localStorage.zendeskUrl}/api/v2/users/${localStorage.zendeskUserId}/tickets/assigned.json`

        fetch(url, {headers: headers}).then(res => res.json())
          .then(function (data) {

            let correctData = [];
            if (sanitize) {

              for (let i = 0; i < data.tickets.length; i++) {
                correctData.push({
                  name: '#' + data.tickets[i].id + ' - ' + data.tickets[i].subject
                });
              }
            }
            else {
              correctData = data.tickets
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
