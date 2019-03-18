/**
 * Task List controller.
 */
angular.module('thyme').controller('TaskListCtrl', function ($scope, $timeout, $http, $uibModal, worklogs, extService) {
  const ipc = require('electron').ipcRenderer;

  $scope.rowDate = '';
  $scope.lastDate = '';
  $scope.filter = {}
  $scope.taskInfo = []
  $scope.totals = {}
  $scope.dateIndex = {}
  $scope.filter.date = new Date();
  $scope.activeTask = {id: false};
  $scope.time = {
    budget: '--:--',
    spent: '--:--',
    remaining: '--:--',
    loading: false,
    totals: {}
  }

  function stopTimers () {
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
    $scope.activeTask = {id: false};
  }


  function startTimer (worklog_id) {
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

      $scope.activeTask = worklog
      ipc.send('start-worklog', worklog);
    }
  }

  ipc.on('emit-event', (event, payload) => {
    if (payload && payload.action === 'select-date') {
      let dateFrom = new XDate(payload.data.date);
      let dateTo = new XDate(payload.data.date);
      let timeFrom = dateFrom.clearTime().getTime();
      let timeTo = dateTo.setHours(23).setMinutes(59).getTime();

      getTasks(timeFrom, timeTo);
    }
  })

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
    $scope.activeTask = worklog

    worklogs.save(worklog);
  });


  function getTasks (from, to) {
    if (!from) {
      from = 0;
    }

    if (!to) {
      to = 0;
    }

    worklogs.get(from, to, false).then(function (data) {
      $scope.worklogs = {};
      $scope.worklogs = data;

      angular.forEach($scope.worklogs, function (worklog, key) {
        if (worklog && worklog.active) {
          $scope.activeTask = worklog;
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
        worklog.register_info.external_id = data.id;
        worklogs.save(worklog);
      }

      worklog.saving_log = false;
    });
  };

  $scope.formatMinutesToTime = function (minutes) {
    return timeHelper.formatMinutesToTime(minutes);
  };

  $scope.worklogTotal = function (worklog) {
    return timeHelper.formattedTotalForWorklog(worklog);
  };

  function getTaskInfo (worklog) {
    if (worklog.task_id) {

      $scope.time.loading = true
      fetch(`${localStorage['dashboardUrl']}api/tracker/task/${worklog.task_id}/info?api_token=${localStorage['internalApiToken']}`, {headers: helper.basicAuthHeaders})
        .then(res => res.json())
        .then(data => {
          if (!$scope.taskInfo[worklog.task_id]) {
            $scope.taskInfo[worklog.task_id] = {}
          }
          $scope.taskInfo[worklog.task_id] = data

          $scope.time.loading = false
        })
        .catch(error => {
          $scope.time = {
            budget: '--:--',
            spent: '--:--',
            remaining: '--:--',
            loading: false
          }
        })
    }
  }


  // Refresh page, make the counter run.
  function fireDigest () {
    $timeout(fireDigest, 1000);

    $scope.time.totals = {}

    updateTotals()

    angular.forEach($scope.worklogs, function (worklog, key) {
      if (worklog.register_info) {
        return
      }

      if (!$scope.time.totals[worklog.task_id]) {
        $scope.time.totals[worklog.task_id] = 0
      }
      let minutes_used = timeHelper.calculateTotalForWorklog(worklog)
      $scope.time.totals[worklog.task_id] = $scope.time.totals[worklog.task_id] + minutes_used

    })

    // Find active worklog while at it.
    angular.forEach($scope.worklogs, function (worklog, key) {
      // Calculate task usage overview
      if (worklog.active) {
        if ($scope.taskInfo[worklog.task_id]) {
          let taskInfo = $scope.taskInfo[worklog.task_id]
          let minutes_used = $scope.time.totals[worklog.task_id]

          let hours_used = taskInfo.total_hours + (minutes_used / 60)

          $scope.time.spent = timeHelper.formatMinutesToTime(hours_used * 60)
          $scope.time.budget = timeHelper.formatMinutesToTime(taskInfo.budget * 60)
          $scope.time.remaining = '--:--'

          if (taskInfo.budget - hours_used > 0) {
            $scope.time.remaining = timeHelper.formatMinutesToTime((taskInfo.budget - hours_used) * 60)
          }
        } else {
          $scope.taskInfo[worklog.task_id] = {loading: true}
          getTaskInfo(worklog)
        }
      }
    });
  }

  fireDigest()

  function updateTaskInfo () {
    $timeout(updateTaskInfo, 10 * 60 * 1000)
    getTaskInfo($scope.activeTask)
  }

  updateTaskInfo()

  function updateTotals () {
    $scope.dateIndex = {}
    $scope.totals = {}

    if ($scope.worklogs) {
      data = JSON.parse(JSON.stringify($scope.worklogs))
      data.reverse()

      angular.forEach(data, function (worklog, key) {
        let date = new XDate(worklog.created).toString('dd/MM/yy');
        let minutes = timeHelper.calculateTotalForWorklog(worklog)
        if (!$scope.totals[date]) {
          $scope.totals[date] = 0;
          $scope.dateIndex[date] = 0;
        }
        $scope.totals[date] = $scope.totals[date] + minutes
        $scope.dateIndex[date] = key
      })
    }
  }
});
