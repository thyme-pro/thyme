/**
 * Task List controller.
 */
angular.module('thyme').controller('TaskListCtrl', function($scope, $timeout, $http, $modal, dbService, extService, $rootScope) {

  const ipc = require('electron').ipcRenderer

  $scope.dateFrom = new Date();
  $scope.dateTo = new Date();
  $scope.alwaysIncludeUnregistered = true;
  $scope.rowDate = '';

  var timeFrom = 0;
  var timeTo = 0;

  $scope.$watch('dateFrom', function(){
    dateFrom = new XDate($scope.dateFrom);
    dateTo = new XDate($scope.dateTo);
    timeFrom = dateFrom.clearTime().getTime();
    timeTo = dateTo.setHours(23).setMinutes(59).getTime();

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.dateTo = dateFrom;
    }

    getTasks(timeFrom, timeTo);
  });

  $scope.$watch('dateTo', function(){
    dateFrom = new XDate($scope.dateFrom);
    dateTo = new XDate($scope.dateTo);
    timeFrom = dateFrom.clearTime().getTime();
    timeTo = dateTo.setHours(23).setMinutes(59).getTime();

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.dateFrom = dateTo;
    }

    getTasks(timeFrom, timeTo);
  });

  function getTasks(timeFrom, timeTo) {
    var unregistered = $scope.alwaysIncludeUnregistered;
    dbService.getTasks(timeFrom, timeTo, unregistered).then(function(data){
      $scope.tasks = {};
      $scope.tasks = data;

      angular.forEach($scope.tasks, function(task, key){
        if (task.active) {
          $scope.activeTask = $scope.tasks[task.id];
        }
      })

    });

  }

  $scope.$on('addedTask', function(event){
    getTasks(timeFrom, timeTo);
  });

  $scope.showDate = function(task) {
    if (task.created) {
      date = new XDate(task.created).toString('dd/MM/yy');
      if (date !== $scope.rowDate) {
        $scope.rowDate = date;

        return true;
      }
    }
    return false;
  };

  $scope.resetDate = function() {
    $scope.dateFrom = new Date();
    $scope.dateTo = new Date();
  };

  $scope.startTask = function(task_id) {
    dbService.startTime(task_id);

    $scope.activeTask = $scope.tasks[task_id];
  };

  $scope.stopTask = function(task_id) {
    angular.forEach($scope.tasks[task_id].time_entries, function(value, key){
      if (value.stop === undefined) {
        $scope.tasks[task_id].time_entries[key].stop = new Date().getTime();
      }
    });

    $scope.activeTask = {};
    dbService.endAllTimeEntries();
  };

  // Send the task object to the modal
  $scope.editTask = function(task) {
    var modalInstance = $modal.open({
      templateUrl: 'templates/add/modalAddTask.html',
      controller: 'ModalCreateCtrl',
      size: 'lg',
      resolve: {
        task: function () {
          return task;
        }
      }
    });
    modalInstance.result.then(function (selectedItem) {
      setTimeout(function(){
        $rootScope.$broadcast('addedTask');
      }, 200);
    }, function () {
    });
  };

  $scope.deleteTask = function(task_id) {
    dbService.deleteTask(task_id);
  };

  $scope.registerTask = function(task) {
    task.saving_log = true;
    extService.logTime(task).then(function(data){
      if (data.success == true) {
        task.register_info = {};
        task.register_info.date_entered = new Date().getTime();
			  task.register_info.sugar_id = 1;
			  task.register_info.issue_key = task.issue_key;
        task.register_info.time_length = 1;
			  dbService.saveRegisterInfo(task);
			}

			task.saving_log = false;
    });
  };

  $scope.listTotal = function() {
    var total_minutes = 0;

    angular.forEach($scope.tasks, function(task, key) {
      total_minutes += calculate_total_minutes_for_task(task);
    });

    return format_minutes_to_time(total_minutes);
  };

  $scope.timeTotal = function(task) {
    return calculate_total_for_task(task);
  };

  $scope.browseIssue = function(issue_key) {
    nw.Shell.openExternal(localStorage.jiraUrl + '/browse/' + issue_key);
  }

  // Refresh page, make the counter run.
  function fireDigest() {
      $timeout(fireDigest, 1500);
  }
  fireDigest();


  if (localStorage.notificationInterval >>> 0 === parseFloat(localStorage.notificationInterval)) {

    interval = localStorage.notificationInterval * 60 * 1000

    setInterval(function() {
      notificationMessage = 'Get to work!';

      if ($scope.activeTask && $scope.activeTask.active) {
        notificationMessage = $scope.activeTask.issue_key + " - " + $scope.activeTask.task
        notificationMessage += "\nTime used: " + $scope.timeTotal($scope.activeTask)
      }

      var notif = new window.Notification('Thyme', {
        body: notificationMessage,
        silent: true
      })
    }, interval);
  }
});
