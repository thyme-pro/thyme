/**
 * Main page controller.
 */
angular.module('thyme').controller('CalendarCtrl', function($scope, $rootScope, dbService, gapiService) {

  $scope.events = {};

  gapiService.getEvents().then(function(data) {

    for (let i = 0; i < data.length; i++) {
      const event = data[i];
      if (event.description) {
        data[i].issue_key = event.description.match(/([a-z]+-[0-9]+)/i)[0];
      }
    }

    $scope.events = data;
  });


  $scope.start = function(event) {
    let task = {};
    task.task = event.summary;
    task.issue = event.issue_key;
    task.issue_key = event.issue_key;

    dbService.saveTask(task);
    $rootScope.$broadcast('addedTask');
  };
});
