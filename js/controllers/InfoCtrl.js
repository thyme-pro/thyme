angular.module('thyme').controller('InfoCtrl', function ($scope, $log, $timeout, extService) {
  const ipc = require('electron').ipcRenderer;

  $log.log('InfoCtrl loaded')

  $scope.apiToken = localStorage['internalApiToken']

  $scope.url = localStorage['dashboardUrl']
  $scope.taskId = null
  $scope.infoData = {}
  $scope.myTickets = {}
  $scope.ftpProgram = localStorage['ftpProgram']

  function fetchInfo () {
    $timeout(fetchInfo, 1000 * 60 * 5);

    fetch(`${$scope.url}api/tracker/info?api_token=${$scope.apiToken}`, {headers: helper.basicAuthHeaders})
      .then(res => res.json())
      .then(data => {
        data.rp_tasks = parseTasks(data.rp_tasks);
        $scope.infoData = data
      })

    extService.getTickets(false).then(data => {
      $scope.myTickets = data.filter((ticket) => {
        return ['open', 'pending', 'hold'].includes(ticket.status)
      })

      $scope.myTickets = parseTickets($scope.myTickets);
    })

  }

  fetchInfo()

  $scope.openBrowserWithTask = (task) => {
    const regex = /#([0-9]*)/gm

    let m;
    m = regex.exec(task)
    let id = m[1];
    let ticketUrl = localStorage['zendeskUrl'] + 'agent/tickets/' + id
    open(ticketUrl);
  }

  const {clipboard} = require('electron')

  $scope.copyClipboard = (text) => {
    clipboard.writeText(text)
  }

  $scope.ftpOpen = (hostname, user, password) => {
    console.log(open(`ftp://${user}:${password}@${hostname}`, {app: localStorage['ftpProgram']}))
  }

  $scope.openURL = (url) => {
    open(url)
  }

  $scope.openZendesk = () => {
    open(localStorage['zendeskUrl'])
  }

  $scope.openBrowserWithTicket = (id) => {
    let ticketUrl = localStorage['zendeskUrl'] + 'agent/tickets/' + id
    open(ticketUrl);
  }

  $scope.startTrackerForTicket = (id, subject) => {
    const description = `#${id} - ${subject}`
    $scope.startTrackerForTask({task: description})
  }

  $scope.startTrackerForTask = (task) => {
    const regex = /#([0-9]*)/gm

    let m;
    m = regex.exec(task.task)
    let id = ''
    if (m && m.length) {
      id = m[1];
    }
    else {
      ipc.send('edit-worklog', {})
      return
    }

    searchTask(id).then(data => {
      if (data.task) {
        ipc.send('edit-worklog', data)
      } else {
        ipc.send('edit-worklog', {'description': task.task})
      }

    }).catch(data => {
      console.log('error')
    })
  }

  function searchTask (search) {
    return fetch(`${$scope.url}api/tracker/task/search/${search}/?api_token=${$scope.apiToken}`)
      .then(res => res.json())
  }

    function parseTasks (tasks) {
        return Object.entries(tasks).map((task) => {
            task = task[1];
            let taskSplit = task.task.split("-").map((str) => str.trim());
            if(taskSplit.length > 1) {
                task.id = taskSplit[0];
                task.desc = taskSplit[1];
            }
            task.statusKey = task.is_done ? 'l' : 'å';
            return task;
        });
    }

    function parseTickets (tickets) {
        return tickets.map((ticket) => {
            ticket.status = {
                key: (ticket.status === 'pending' ? 'v' : 'å'),
                string: ticket.status
            };
            ticket.week = ticket.fields.find(t => {
                return t.id === 44228089;
            });
            return ticket;
        });
    }
});
