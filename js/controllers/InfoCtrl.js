angular.module('thyme').controller('InfoCtrl', function ($scope, $log, $timeout) {
  $log.log('InfoCtrl loaded')

  $scope.apiToken = localStorage['internalApiToken']

  $scope.url = 'http://dashboard.test'
  $scope.infoData = {}

  function fetchInfo() {
    $timeout(fetchInfo, 1000 * 60 * 5);

    fetch($scope.url + '/api/tracker/info?api_token=' + $scope.apiToken)
      .then(res => res.json())
      .then(data => {
        $scope.infoData = data
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

  $scope.openRP = () => {
    open('https://docs.google.com/spreadsheets/d/1eRvXCFW_hsCnxrq8h_MAZKKI1WrufphjRUnkpw7FKHU/')
  }
  $scope.openZendesk = () => {
    open(localStorage['zendeskUrl'])
  }

  $scope.openBrowserWithTicket = (id) => {
    let ticketUrl = localStorage['zendeskUrl'] + 'agent/tickets/' + id
    open(ticketUrl);
  }

  $scope.startTrackerForTicket = (id, subject) => {
    console.log(id)
    const description = `#${id} - ${subject}`
    ipc.send('edit-worklog', {'description': description})
  }

  $scope.startTrackerForTask = (task) => {
    const regex = /#([0-9]*)/gm

    let m;
    m = regex.exec(task.task)
    let id = m[1];

    searchTask(id).then(data => {
      console.log(data)
      ipc.send('edit-worklog', data)
    })
  }

  function searchTask(search) {
    return fetch(`${$scope.url}/api/tracker/task/search/${search}/?api_token=${$scope.apiToken}`)
      .then(res => res.json())
  }
});
