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
        $scope.infoData = data
      })

    extService.getTickets(false).then(data => {
      $scope.myTickets = data.filter((ticket) => {
        return ['open', 'pending', 'hold'].includes(ticket.status)
      })
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


  ipc.on('save-worklog', (event, data) => {
    let worklog = data.obj;
    if ($scope.taskId != worklog.task_id) {
      $scope.fetchCustomerInfo(worklog.task_id)
      $scope.taskId = worklog.task_id;
    }
  })

  ipc.on('start-worklog', (event, data) => {
    let worklog = data.obj;
    if ($scope.taskId != worklog.task_id) {
      $scope.fetchCustomerInfo(worklog.task_id)
      $scope.taskId = worklog.task_id;
    }
  })

  const {clipboard} = require('electron')

  $scope.copyClipboard = (text) => {
    clipboard.writeText(text)
  }

  $scope.ftpOpen = (hostname, user, password) => {
    console.log(open(`ftp://${user}:${password}@${hostname}`, {app: localStorage['ftpProgram']}))
  }

  $scope.fetchCustomerInfo = (taskId) => {
    $scope.customerInfo = {}

    fetch(`${$scope.url}api/tracker/customer/info/${taskId}?api_token=${$scope.apiToken}`, {
      headers: helper.basicAuthHeaders
    })
      .then(res => res.json())
      .then(data => {
        $scope.customerInfo = data
      })
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
});
