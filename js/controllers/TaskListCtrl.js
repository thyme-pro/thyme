/**
 * Task List controller.
 */
angular.module('thyme').controller('TaskListCtrl', function($scope, $timeout, $http, $modal, worklogs, extService) {

  function stopTimers() {
    let saveWorklog;

    _.each($scope.tasks, function(worklog, key){
      $scope.tasks[key].active = false;

      saveWorklog = false;

      _.each($scope.tasks[key].time_entries, function(timeEntry){
        if (isNaN(timeEntry.stop) || !timeEntry.stop) {
          timeEntry.stop = new Date().getTime();

          saveWorklog = true;
        }
      });

      if (saveWorklog) {
        worklogs.save(worklog);
      }
    });
  }

  function startTimer(worklog_id) {
    let worklog = null;

    _.each($scope.tasks, function(_worklog, key) {
      if (_worklog.id == worklog_id) {
        worklog = $scope.tasks[key];
      }
    });

    stopTimers();

    if (worklog) {
      worklog.active = true;

      let key = 'new-' + _.keys(worklog.time_entries).length;
      if (!worklog.time_entries) {
        worklog.time_entries = {};
      }

      worklog.time_entries[key] = {};
      worklog.time_entries[key].start = new XDate().getTime();
      worklog.time_entries[key].stop = '';
      worklog.time_entries[key].id = key;

      worklogs.save(worklog);
    }
  }

  const ipc = require('electron').ipcRenderer;

  ipc.on('save-worklog', (event, data) => {
    let worklog = data.obj;
    if (!worklog.issue) {
      worklog.issue = worklog.issue_key;
    }

    if (worklog.time_entries === undefined) {
      stopTimers();

      let key = 'new-' + _.keys(worklog.time_entries).length;

      worklog.active = true;
      worklog.time_entries = {};
      worklog.time_entries[key] = {};
      worklog.time_entries[key].start = new XDate().getTime();
      worklog.time_entries[key].stop = '';
      worklog.time_entries[key].id = key;
    }

    worklogs.save(worklog);

  });

  $scope.dateFrom = new Date();
  $scope.dateTo = new Date();
  $scope.alwaysIncludeUnregistered = true;
  $scope.rowDate = '';

  let timeFrom = 0;
  let timeTo = 0;

  $scope.$watch('dateFrom', function(){
    let dateFrom = new XDate($scope.dateFrom);
    let dateTo = new XDate($scope.dateTo);
    let timeFrom = dateFrom.clearTime().getTime();
    let timeTo = dateTo.setHours(23).setMinutes(59).getTime();

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.dateTo = dateFrom;
    }

    getTasks(timeFrom, timeTo);
  });

  $scope.$watch('dateTo', function(){
    let dateFrom = new XDate($scope.dateFrom);
    let dateTo = new XDate($scope.dateTo);
    let timeFrom = dateFrom.clearTime().getTime();
    let timeTo = dateTo.setHours(23).setMinutes(59).getTime();

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.dateFrom = dateTo;
    }

    getTasks(timeFrom, timeTo);
  });

  function getTasks(from, to) {
    if (!from) {
      from = timeFrom;
    }

    if (!to) {
      to = timeTo;
    }

    let unregistered = $scope.alwaysIncludeUnregistered;
    worklogs.get(from, to, unregistered).then(function(data){
      $scope.tasks = {};
      $scope.tasks = data;

      angular.forEach($scope.tasks, function(task){
        if (task.active) {
          $scope.activeTask = $scope.tasks[task.id];
        }
      });

    });
  }

  $scope.showDate = function(task) {
    if (task.created) {
      let date = new XDate(task.created).toString('dd/MM/yy');
      if (date !== $scope.rowDate) {
        $scope.rowDate = date;

        return true;
      }
    }
    return false;
  };

  $scope.resetDate = () => {
    $scope.dateFrom = new Date();
    $scope.dateTo = new Date();
  };

  $scope.startTask = (task_id) => {
    startTimer(task_id);
  };

  $scope.stopTask = () => {
    stopTimers();
  };

  // Send the task object to the modal
  $scope.editTask = (task) => {
    ipc.send('edit-worklog', task);
  };

  $scope.deleteTask = (task_id) => {
    worklogs.delete(task_id);
  };

  $scope.registerTask = (task) => {
    task.saving_log = true;

    extService.logTime(task).then(function(data){
      if (data.success == true) {
        task.register_info = {};
        task.register_info.date_entered = new Date().getTime();
        task.register_info.sugar_id = 1;
        task.register_info.issue_key = task.issue_key;
        task.register_info.time_length = 1;
        worklogs.save(task);
      }

      task.saving_log = false;
    });
  };

  $scope.listTotal = function() {
    let total_minutes = 0;

    angular.forEach($scope.tasks, function(task) {
      total_minutes += timeHelper.calculateTotalForWorklog(task);
    });

    return timeHelper.formatMinutesToTime(total_minutes);
  };

  $scope.timeTotal = function(task) {
    return timeHelper.formattedTotalForWorklog(task);
  };

  $scope.browseIssue = function(issue_key) {
    issue_key;
  };

  // Refresh page, make the counter run.
  function fireDigest() {
    $timeout(fireDigest, 200);

      // Find active task while at it.
    $scope.activeTask = {};

    angular.forEach($scope.tasks, function(task){
      if (task.active) {
        $scope.activeTask = $scope.tasks[task.id];
      }
    });
  }
  fireDigest();

  /**
   * Notification loop.
   */
  if (localStorage.notificationInterval >>> 0 === parseFloat(localStorage.notificationInterval)) {
    const interval = localStorage.notificationInterval * 60 * 1000;

    setInterval(function() {
      let notificationMessage = 'Get to work!';

      if ($scope.activeTask && $scope.activeTask.active) {
        notificationMessage = $scope.activeTask.issue_key + ' - ' + $scope.activeTask.task;
        notificationMessage += '\nTime used: ' + $scope.timeTotal($scope.activeTask);
      }

      new window.Notification('Thyme', {
        body: notificationMessage,
        silent: true
      });
    }, interval);
  }
});
