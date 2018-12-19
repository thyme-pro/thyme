/**
 * Controller for worklog creation
 */
angular.module('thyme').controller('CreateCtrl', function ($scope, $http, dbService, extService) {
  const ipc = require('electron').ipcRenderer;

  // Define tabs in modal.
  // They all share this controller.
  $scope.tabs = [
    {title: 'Add worklog', icon: 'edit', template: '../templates/add/tabAddWorklog.html'},
    {title: 'Task overview', icon: 'time', template: '../templates/add/tabWorklogOverview.html'},
  ];

  $scope.setTab = (tab) => {
    $scope.activeTab = tab.title;
    $scope.tab = tab;
  };

  $scope.setTab($scope.tabs[0]);

  $scope.worklog = {};

  ipc.on('edit-worklog', (event, data) => {
    $scope.worklog = data.obj;
    $scope.format();

    if ($scope.worklog.created) {
      $scope.datepicker.start_date = new XDate($scope.worklog.created);
      $scope.updateCreated();
    }
  });

  $scope.stories = [];
  $scope.tasksLoaded = false;

  // Load tasks from localstorage cache.
  try {
    $scope.tasks = JSON.parse(localStorage.tasks);
  } catch (exception) {
    $scope.tasks = [];
  }

  extService.getTickets().then(function (data) {
    $scope.stories = data;
  });

  extService.getIssues().then(function (data) {
    $scope.tasks = data;
    localStorage.tasks = JSON.stringify(data);
    $scope.tasksLoaded = true;
  });

  $scope.selectTask = function ($item) {
    $scope.worklog.task_id = $item.task_id;

    $scope.setProgress($item.timeoriginalestimate, $item.timeestimate, $item.timespent);
  };

  $scope.setProgress = function (originalestimate, estimate, spent) {
    $scope.task_estimate = 'N/A';
    $scope.time_remaining_formatted = 'N/A';

    let entire_estimate = originalestimate;
    if (estimate) {
      entire_estimate = (originalestimate + estimate) - spent;
    }

    $scope.percent_used = Math.round(spent / (entire_estimate) * 100);

    if (entire_estimate) {
      $scope.task_estimate = timeHelper.formatMinutesToTime(entire_estimate / 60);
    }
    $scope.time_used_formatted = timeHelper.formatMinutesToTime(spent / 60);

    let time_remaining = (entire_estimate - spent) / 60;
    if (time_remaining > 0) {
      $scope.time_remaining_formatted = timeHelper.formatMinutesToTime(time_remaining);
    }

    if (isNaN($scope.percent_used)) {
      $scope.percent_used = 0;
    }
  };

  $scope.$watch('percent_used', function () {
    if (isNaN($scope.time_used) || $scope.time_used === 0) {
      $scope.alert = {
        show: false,
        type: 'success'
      };
    }
    if ($scope.percent_used < 80) {
      $scope.alert = {
        show: false,
        type: 'success'
      };
    }
    else if ($scope.percent_used >= 80 && $scope.percent_used < 99) {
      $scope.alert = {
        show: true,
        type: 'warning',
        msg: $scope.percent_used + '% used'
      };
    }
    else if ($scope.percent_used >= 100) {
      $scope.alert = {
        show: true,
        type: 'danger',
        msg: $scope.percent_used + '% used'
      };
    }
  });

  $scope.saveTimeEntry = function (time_entry) {
    let startObj = new XDate();
    if ($scope.worklog.created) {
      startObj = new XDate($scope.worklog.created);
    }
    let start_time_split = time_entry.start_formatted.split(':');

    startObj.setHours(start_time_split[0]);
    startObj.setMinutes(start_time_split[1]);

    let stopObj = new XDate(startObj);

    if (time_entry.expression) {
      stopObj.addMinutes(timeHelper.parseTimeExpression(time_entry.expression));
    }

    let start = startObj.getTime();
    let stop = stopObj.getTime();

    $scope.worklog.time_entries[time_entry.id].start = start;
    $scope.worklog.time_entries[time_entry.id].stop = stop;

    $scope.format();
  };

  $scope.formatDate = function (timestamp) {
    if (timestamp < 2000000000) {
      timestamp = timestamp * 1000;
      return new XDate(timestamp).toString('HH:mm');
    }
    return new XDate(timestamp).toString('HH:mm');
  };


  $scope.deleteTimeEntry = function (time_entry) {
    delete $scope.worklog.time_entries[time_entry.id];
    dbService.deleteTimeEntry($scope.worklog.id, time_entry.id);
    $scope.format();
  };

  $scope.format = function formatTimeEntries() {
    $scope.worklog.total_duration = timeHelper.formattedTotalForWorklog($scope.worklog);

    angular.forEach($scope.worklog.time_entries, function (time_entry, key) {
      $scope.worklog.time_entries[key].duration_formatted = timeHelper.formatMinutesToTime(timeHelper.calculateMinutesForTimeEntry(time_entry));
      $scope.worklog.time_entries[key].start_formatted = new XDate(time_entry.start).toString('HH:mm');
      if (time_entry.stop !== undefined && !isNaN(time_entry.stop)) {
        $scope.worklog.time_entries[key].stop_formatted = new XDate(time_entry.stop).toString('HH:mm');
      }
    });
  };

  $scope.format();

  $scope.addTimeEntry = function () {
    let key = 'new-' + _.keys($scope.worklog.time_entries).length;
    if (!$scope.worklog.time_entries) {
      $scope.worklog.time_entries = {};
    }
    $scope.worklog.time_entries[key] = {};
    $scope.worklog.time_entries[key].start = new XDate().getTime();
    $scope.worklog.time_entries[key].stop = new XDate().getTime();
    $scope.worklog.time_entries[key].id = key;
    $scope.worklog.time_entries[key].edit = true;

    $scope.format();
  };

  $scope.datepicker = {};
  $scope.datepicker.start_date = new XDate();

  $scope.updateCreated = () => {
    let date = new XDate($scope.datepicker.start_date);
    $scope.worklog.created = date.getTime();
    $scope.datepicker.formatted = date.toString('H:mm:ss dd/MM/yyyy');
  };

  $scope.datepicker.setYesterday = () => {
    $scope.datepicker.start_date = new XDate().addDays(-1);
    $scope.updateCreated();
  };

  $scope.datepicker.setToday = () => {
    $scope.datepicker.start_date = new XDate();
    $scope.updateCreated();
  };

  $scope.datepicker.setTomorrow = () => {
    $scope.datepicker.start_date = new XDate().addDays(1);
    $scope.updateCreated();
  };

  $scope.updateCreated();

  $scope.ok = function () {
    ipc.send('save-worklog', $scope.worklog);
    // Close window
    const remote = require('electron').remote;
    let window = remote.getCurrentWindow();
    window.close();
  };

  $scope.cancel = function () {
    // Close window
    const remote = require('electron').remote;
    let window = remote.getCurrentWindow();
    window.close();
  };
});
