angular.module('thyme').controller('TopCtrl', function ($scope, $log, $timeout, extService) {
  const ipc = require('electron').ipcRenderer;

  $scope.apiToken = localStorage['internalApiToken']
  $scope.url = localStorage['dashboardUrl']
  $scope.taskId = null
  $scope.infoData = {}
  $scope.myTickets = {}
  $scope.ftpProgram = localStorage['ftpProgram']

  $scope.editDate = false

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

  $scope.filter = {}
  $scope.filter.date = new Date();
  $scope.filter.editDate = false;
  $scope.$watch('filter.date', function () {
    ipc.send('emit-event', {
      action: 'select-date',
      data: {
        date: $scope.filter.date
      }
    })
  })

  $scope.today = function () {
    $scope.filter.date = new Date();
  };
});
