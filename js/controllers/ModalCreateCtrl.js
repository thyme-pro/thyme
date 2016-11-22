/**
 * Controller for task creation
 */
angular.module('thyme').controller('ModalCreateCtrl', function($scope, $http, $modalInstance, task, dbService, extService) {
  // Define tabs in modal.
  // They all share this controller.
  $scope.tabs = [
    {title: 'Add task', icon: 'edit', template: 'templates/add/tabAddTask.html' },
    {title: 'Task overview', icon: 'time', template: 'templates/add/tabTaskOverview.html' },
    {title: 'Case overview', icon: 'list', template: 'templates/add/tabCaseOverview.html' },
  ];

  // Set task form dbService, if its not new.
  $scope.task = {};
  if (dbService.tasks[task.id] !== undefined){
    $scope.task = dbService.tasks[task.id];
  }


  $scope.stories = [];
  $scope.issues = [];

  extService.getTasks().then(function(data){
    $scope.stories = data;
  });

  extService.getIssues().then(function(data){
    $scope.issues = data;
  });

  $scope.selectIssue = function($item, $model, $label, issue) {
    var issue_key = $item.issue_key;
    $scope.task.issue_key = issue_key;

    console.log($item);
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

  $scope.ok = function() {
    dbService.saveTask($scope.task);
    $modalInstance.close("info sent from modal");
  };

  $scope.cancel = function() {
    $modalInstance.close();
  };
});
