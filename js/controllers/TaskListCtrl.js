/**
 * Task List controller.
 */
angular.module('thyme').controller('TaskListCtrl', function ($scope, $timeout, $http, $uibModal, worklogs, extService) {

  function stopTimers() {
    let saveWorklog;

    _.each($scope.worklogs, function (worklog, key) {
      $scope.worklogs[key].active = false;

      saveWorklog = false;

      _.each($scope.worklogs[key].time_entries, function (timeEntry) {
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

    _.each($scope.worklogs, function (_worklog, key) {
      if (_worklog.id == worklog_id) {
        worklog = $scope.worklogs[key];
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

  $scope.alwaysIncludeUnregistered = true;
  $scope.rowDate = '';
  $scope.filter = {}
  $scope.filter.dateFrom = new Date();
  $scope.filter.dateTo = new Date();

  let timeFrom = 0;
  let timeTo = 0;


  $scope.$watch('filter.dateFrom', function () {
    let dateFrom = new XDate($scope.filter.dateFrom);
    let dateTo = new XDate($scope.filter.dateTo);
    let timeFrom = dateFrom.clearTime().getTime();
    let timeTo = dateTo.setHours(23).setMinutes(59).getTime();

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.filter.dateTo = $scope.filter.dateFrom;
    }

    getTasks(timeFrom, timeTo);
  });

  $scope.$watch('filter.dateTo', function () {
    let dateFrom = new XDate($scope.filter.dateFrom);
    let dateTo = new XDate($scope.filter.dateTo);
    let timeFrom = dateFrom.clearTime().getTime();
    let timeTo = dateTo.setHours(23).setMinutes(59).getTime();

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.filter.dateFrom = $scope.filter.dateTo;
    }

    getTasks(timeFrom, timeTo);
  });

  function getTasks(from, to) {
    console.log(from, to)
    if (!from) {
      from = timeFrom;
    }

    if (!to) {
      to = timeTo;
    }

    let unregistered = $scope.alwaysIncludeUnregistered;
    worklogs.get(from, to, unregistered).then(function (data) {
      $scope.worklogs = {};
      $scope.worklogs = data;

      angular.forEach($scope.worklogs, function (worklog) {
        if (worklog && worklog.active) {
          $scope.activeTask = $scope.worklogs[worklog.id];
        }
      });

    });
  }

  $scope.showDate = function (worklog) {
    if (worklog && worklog.created) {
      let date = new XDate(worklog.created).toString('dd/MM/yy');
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

  // Send the worklog object to the modal
  $scope.editTask = (worklog) => {
    ipc.send('edit-worklog', worklog);
  };

  $scope.deleteWorklog = (id) => {
    worklogs.delete(id);
  };

  $scope.registerTask = (worklog) => {
    worklog.saving_log = true;

    extService.logTime(worklog).then(function (data) {
      if (data.success == true) {
        worklog.register_info = {};
        worklog.register_info.date_entered = new Date().getTime();
        worklog.register_info.external_id = data.data.id;
        worklogs.save(worklog);
      }

      worklog.saving_log = false;
    });
  };

  $scope.listTotal = function () {
    let total_minutes = 0;

    angular.forEach($scope.worklogs, function (worklog) {
      total_minutes += timeHelper.calculateTotalForWorklog(worklog);
    });

    return timeHelper.formatMinutesToTime(total_minutes);
  };

  $scope.timeTotal = function (worklog) {
    return timeHelper.formattedTotalForWorklog(worklog);
  };

  $scope.browseIssue = function (issue_key) {
    issue_key;
  };

  // Refresh page, make the counter run.
  function fireDigest() {
    $timeout(fireDigest, 2000);

    // Find active worklog while at it.
    $scope.activeTask = {};

    angular.forEach($scope.worklogs, function (worklog) {
      if (worklog.active) {
        $scope.activeTask = $scope.worklogs[worklog.id];
      }
    });
  }

  fireDigest();

  /**
   * Notification loop.
   */
  if (localStorage.notificationInterval >>> 0 === parseFloat(localStorage.notificationInterval)) {
    const interval = localStorage.notificationInterval * 60 * 1000;

    setInterval(function () {
      let notificationMessage = 'Get to work!';

      if ($scope.activeTask && $scope.activeTask.active) {
        notificationMessage = $scope.activeTask.issue_key + ' - ' + $scope.activeTask.worklog;
        notificationMessage += '\nTime used: ' + $scope.timeTotal($scope.activeTask);
      }

      new window.Notification('Thyme', {
        body: notificationMessage,
        silent: true
      });
    }, interval);
  }
});
