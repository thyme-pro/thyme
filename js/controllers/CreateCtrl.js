/**
 * Controller for task creation
 */
angular.module('thyme').controller('CreateCtrl', function($scope, $http, dbService, extService) {
  const ipc = require('electron').ipcRenderer

  // Define tabs in modal.
  // They all share this controller.
  $scope.tabs = [
    {title: 'Add task', icon: 'edit', template: '../templates/add/tabAddTask.html' },
    {title: 'Task overview', icon: 'time', template: '../templates/add/tabTaskOverview.html' },
  ];

  $scope.setTab = (tab) => {
    $scope.activeTab = tab.title;
    $scope.tab = tab;
  }

  $scope.setTab($scope.tabs[0]);

  // Set task form dbService, if its not new.
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
    entire_estimate = originalestimate + estimate - spent;

    $scope.percent_used = Math.round(spent / (entire_estimate) * 100);

    $scope.task_estimate = format_minutes_to_time(entire_estimate / 60);
    $scope.time_remaining_formatted = format_minutes_to_time((entire_estimate - spent)/ 60);
    $scope.time_used_formatted = format_minutes_to_time(spent / 60);

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
      };
    }
    else if ($scope.percent_used >= 100) {
      $scope.alert = {
        show: true,
        type: 'danger',
        msg: $scope.percent_used + "% used"
      };
    }
  });

  function calculatePercentage() {
    $scope.percent_used = Math.round($scope.time_used_minutes / ($scope.task_estimate * 60) * 100);
    if (isNaN($scope.percent_used)) {
      $scope.percent_used = 0;
    }
  }

  $scope.saveTimeEntry = function(time_entry) {
    var minutes = get_minutes_from_time(time_entry.duration_formatted);

    var start_split = time_entry.start_formatted.split(' ');
    var start_time_split = start_split[0].split(':');
    var start_date_split = start_split[1].split('/');

    var start = XDate(start_date_split[2], start_date_split[1] - 1, start_date_split[0], start_time_split[0], start_time_split[1], start_time_split[2]).getTime();

    var stop = XDate(start).addMinutes(minutes).getTime();

    $scope.task.time_entries[time_entry.id].start = start;
    $scope.task.time_entries[time_entry.id].stop = stop;

    dbService.updateTimeEntry(start, stop, time_entry.id);

    $scope.format();
  };

  $scope.formatDate = function(timestamp) {
    if (timestamp < 2000000000) {
      timestamp = timestamp * 1000;
      return new XDate(timestamp).toString('H:mm:ss dd/MM/yy');
    }
    return new XDate(timestamp).toString('H:mm:ss dd/MM/yy');
  };


  $scope.deleteTimeEntry = function(time_entry) {
    dbService.deleteTimeEntry($scope.task.id , time_entry.id);
    $scope.format();
  };

  $scope.format = function formatTimeEntries() {
    $scope.task.total_duration = calculate_total_for_task($scope.task);

    angular.forEach($scope.task.time_entries, function(time_entry, key){
      $scope.task.time_entries[key].duration_formatted = format_minutes_to_time(calculate_minutes_for_time_entry(time_entry));
      $scope.task.time_entries[key].start_formatted = new XDate(time_entry.start).toString('H:mm:ss dd/MM/yy');
      if (time_entry.stop !== undefined) {
        $scope.task.time_entries[key].stop_formatted = new XDate(time_entry.stop).toString('H:mm:ss dd/MM/yy');
      }
    });
  };

  $scope.format();

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
