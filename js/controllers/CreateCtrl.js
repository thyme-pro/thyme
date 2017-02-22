/**
 * Controller for task creation
 */
angular.module('thyme').controller('CreateCtrl', function($scope, $http, dbService, extService) {
  const ipc = require('electron').ipcRenderer

  // Define tabs in modal.
  // They all share this controller.
  $scope.tabs = [
    {title: 'Add task', icon: 'edit', template: '../templates/add/tabAddWorklog.html' },
    {title: 'Task overview', icon: 'time', template: '../templates/add/tabWorklogOverview.html' },
  ];

  $scope.setTab = (tab) => {
    $scope.activeTab = tab.title;
    $scope.tab = tab;
  }

  $scope.setTab($scope.tabs[0]);

  $scope.task = {};
  task = {};

  ipc.on('edit-worklog', (event, data) => {
    $scope.task = data.obj
    $scope.format()

    if ($scope.task.created) {
      $scope.datepicker.start_date = new XDate($scope.task.created);
      $scope.updateCreated();
    }
  })

  $scope.stories = []
  $scope.issuesLoaded = false

  // Load issues from localstorage cache.
  try {
    $scope.issues = JSON.parse(localStorage.jiraIssues);
  } catch (exception) {
    $scope.issue = [];
  }

  extService.getTasks().then(function(data){
    $scope.stories = data
  });

  extService.getIssues().then(function(data){
    $scope.issues = data
    localStorage.jiraIssues = JSON.stringify(data)
    $scope.issuesLoaded = true
  });

  $scope.selectIssue = function($item, $model, $label, issue) {
    var issue_key = $item.issue_key;
    $scope.task.issue_key = issue_key;

    $scope.setProgress($item.timeoriginalestimate, $item.timeestimate, $item.timespent);
  }

  $scope.setProgress = function(originalestimate, estimate, spent) {
    $scope.task_estimate = 'N/A';
    $scope.time_remaining_formatted = 'N/A';

    var entire_estimate = originalestimate;
    if (estimate) {
      entire_estimate = (originalestimate + estimate) - spent;
    }

    var percent_used = Math.round(spent / (entire_estimate) * 100);
    $scope.percent_used = Math.round(spent / (entire_estimate) * 100);

    if (entire_estimate) {
      $scope.task_estimate = format_minutes_to_time(entire_estimate / 60);
    }
    $scope.time_used_formatted = format_minutes_to_time(spent / 60);

    var time_remaining = (entire_estimate - spent)/ 60
    if (time_remaining > 0) {
      $scope.time_remaining_formatted = format_minutes_to_time(time_remaining);
    }

    if (isNaN($scope.percent_used)) {
      $scope.percent_used = 0;
    }
  }

  $scope.$watch('percent_used', function() {
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
        msg: $scope.percent_used + "% used"
      };e
    }
    else if ($scope.percent_used >= 100) {
      $scope.alert = {
        show: true,
        type: 'danger',
        msg: $scope.percent_used + "% used"
      };
    }
  });

  $scope.saveTimeEntry = function(time_entry) {
    var startObj = new XDate();
    if ($scope.task.created) {
      startObj = new XDate($scope.task.created);
    }
    var start_time_split = time_entry.start_formatted.split(':');

    startObj.setHours(start_time_split[0]);
    startObj.setMinutes(start_time_split[1]);

    var stopObj = new XDate(startObj);
    if (time_entry.hours) {
      stopObj.addHours(time_entry.hours);
    }
    if (time_entry.minutes) {
      stopObj.addMinutes(time_entry.minutes);
    }
    var start = startObj.getTime();
    var stop = stopObj.getTime();

    $scope.task.time_entries[time_entry.id].start = start;
    $scope.task.time_entries[time_entry.id].stop = stop;

    $scope.format();
  };

  $scope.formatDate = function(timestamp) {
    if (timestamp < 2000000000) {
      timestamp = timestamp * 1000;
      return new XDate(timestamp).toString('HH:mm');
    }
    return new XDate(timestamp).toString('HH:mm');
  };


  $scope.deleteTimeEntry = function(time_entry) {
    delete $scope.task.time_entries[time_entry.id]
    dbService.deleteTimeEntry($scope.task.id, time_entry.id);
    $scope.format();
  };

  $scope.format = function formatTimeEntries() {
    $scope.task.total_duration = calculate_total_for_task($scope.task);

    angular.forEach($scope.task.time_entries, function(time_entry, key){
      $scope.task.time_entries[key].duration_formatted = format_minutes_to_time(calculate_minutes_for_time_entry(time_entry));
      $scope.task.time_entries[key].start_formatted = new XDate(time_entry.start).toString('HH:mm');
      if (time_entry.stop !== undefined && !isNaN(time_entry.stop)) {
        $scope.task.time_entries[key].stop_formatted = new XDate(time_entry.stop).toString('HH:mm');
      }
    });
  };

  $scope.format();

  $scope.addTimeEntry = function() {
    var key = 'new-' + _.keys($scope.task.time_entries).length
    if (!$scope.task.time_entries) {
      $scope.task.time_entries = {};
    }
    $scope.task.time_entries[key] = {};
    $scope.task.time_entries[key].start = new XDate().getTime();
    $scope.task.time_entries[key].stop = new XDate().getTime();
    $scope.task.time_entries[key].id = key;

    $scope.format();
  }

  $scope.datepicker = {};
  $scope.datepicker.start_date = new XDate();

  $scope.updateCreated = () => {
    var date = new XDate($scope.datepicker.start_date);
    $scope.task.created = date.getTime();
    $scope.datepicker.formatted = date.toString('H:mm:ss dd/MM/yyyy');
  }

  $scope.datepicker.setYesterday = () => {
    $scope.datepicker.start_date = new XDate().addDays(-1);
    $scope.updateCreated();
  }

  $scope.datepicker.setToday = () => {
    $scope.datepicker.start_date = new XDate();
    $scope.updateCreated();
  }

  $scope.datepicker.setTomorrow = () => {
    $scope.datepicker.start_date = new XDate().addDays(1);
    $scope.updateCreated();
  }

  $scope.updateCreated();

  $scope.ok = function() {
    ipc.send('save-worklog', $scope.task);
    // Close window
    const remote = require('electron').remote;
    var window = remote.getCurrentWindow();
    window.close();
  };

  $scope.cancel = function() {
    // Close window
    const remote = require('electron').remote;
    var window = remote.getCurrentWindow();
    window.close();
  };
});
