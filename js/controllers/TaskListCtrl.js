/**
 * Task List controller.
 */
angular.module('thyme').controller('TaskListCtrl', function($scope, $timeout, $http, $modal, worklogs, extService, $rootScope) {

  function stopTimers() {
    var self = this
    var saveWorklog

    _.each($scope.tasks, function(worklog, key){
      if (worklog.active) {
        $scope.tasks[key].active = false

        saveWorklog = false

        _.each($scope.tasks[key].time_entries, function(timeEntry, key){
          if (isNaN(timeEntry.stop)) {
            timeEntry.stop = new Date().getTime()

            saveWorklog = true
          }
        })

        if (saveWorklog) {
          worklogs.save(worklog)
        }
      }
    })
  }

  function startTimer (worklog_id) {
    console.log('startTime')
    var self = this
    var worklog = null

    stopTimers()

    _.each($scope.tasks, function(_worklog, key) {
      if (_worklog.id == worklog_id) {
        worklog = $scope.tasks[key]
      }
    })

    if (worklog) {
      worklog.active = true

      var key = 'new-' + _.keys(worklog.time_entries).length
      if (!worklog.time_entries) {
        worklog.time_entries = {}
      }

      worklog.time_entries[key] = {}
      worklog.time_entries[key].start = new XDate().getTime()
      worklog.time_entries[key].stop = ''
      worklog.time_entries[key].id = key

      worklogs.save(worklog)
    }
  }

  const ipc = require('electron').ipcRenderer

  ipc.on('save-worklog', (event, data) => {
    let worklog = data.obj
    if (!worklog.issue) {
      worklog.issue = worklog.issue_key
    }

    if (worklog.time_entries === undefined) {
      var key = 'new-' + _.keys(worklog.time_entries).length

      worklog.active = true
      worklog.time_entries = {}
      worklog.time_entries[key] = {}
      worklog.time_entries[key].start = new XDate().getTime()
      worklog.time_entries[key].stop = ''
      worklog.time_entries[key].id = key
    }

    worklogs.save(worklog)

  })

  $scope.dateFrom = new Date()
  $scope.dateTo = new Date()
  $scope.alwaysIncludeUnregistered = true
  $scope.rowDate = ''

  var timeFrom = 0
  var timeTo = 0

  $scope.$watch('dateFrom', function(){
    dateFrom = new XDate($scope.dateFrom)
    dateTo = new XDate($scope.dateTo)
    timeFrom = dateFrom.clearTime().getTime()
    timeTo = dateTo.setHours(23).setMinutes(59).getTime()

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.dateTo = dateFrom
    }

    getTasks(timeFrom, timeTo)
  })

  $scope.$watch('dateTo', function(){
    dateFrom = new XDate($scope.dateFrom)
    dateTo = new XDate($scope.dateTo)
    timeFrom = dateFrom.clearTime().getTime()
    timeTo = dateTo.setHours(23).setMinutes(59).getTime()

    if (dateFrom.diffMinutes(dateTo) < 0) {
      $scope.dateFrom = dateTo
    }

    getTasks(timeFrom, timeTo)
  })

  function getTasks(from, to) {
    if (!from) {
      from = timeFrom
    }

    if (!to) {
      to = timeTo
    }

    var unregistered = $scope.alwaysIncludeUnregistered
    worklogs.get(from, to, unregistered).then(function(data){
      $scope.tasks = {}
      $scope.tasks = data

      angular.forEach($scope.tasks, function(task, key){
        if (task.active) {
          $scope.activeTask = $scope.tasks[task.id]
        }
      })

    })
  }

  $scope.showDate = function(task) {
    if (task.created) {
      date = new XDate(task.created).toString('dd/MM/yy')
      if (date !== $scope.rowDate) {
        $scope.rowDate = date

        return true
      }
    }
    return false
  }

  $scope.resetDate = () => {
    $scope.dateFrom = new Date()
    $scope.dateTo = new Date()
  }

  $scope.startTask = (task_id) => {
    startTimer(task_id)
  }

  $scope.stopTask = (task_id) => {
    stopTimers()
  }

  // Send the task object to the modal
  $scope.editTask = (task) => {
    ipc.send('edit-worklog', task)
  }

  $scope.deleteTask = (task_id) => {
    worklogs.delete(task_id)
  }

  $scope.registerTask = (task) => {
    task.saving_log = true

    extService.logTime(task).then(function(data){
      if (data.success == true) {
        task.register_info = {}
        task.register_info.date_entered = new Date().getTime()
        task.register_info.sugar_id = 1
        task.register_info.issue_key = task.issue_key
        task.register_info.time_length = 1
        worklogs.save(task)
	  }

	  task.saving_log = false
    })
  }

  $scope.listTotal = function() {
    var total_minutes = 0

    angular.forEach($scope.tasks, function(task, key) {
      total_minutes += calculate_total_minutes_for_task(task)
    })

    return format_minutes_to_time(total_minutes)
  }

  $scope.timeTotal = function(task) {
    return calculate_total_for_task(task)
  }

  $scope.browseIssue = function(issue_key) {
  }

  // Refresh page, make the counter run.
  function fireDigest() {
    $timeout(fireDigest, 200)

      // Find active task while at it.
    $scope.activeTask = {}

    angular.forEach($scope.tasks, function(task, key){
      if (task.active) {
        $scope.activeTask = $scope.tasks[task.id]
      }
    })
  }
  fireDigest()

  /**
   * Notification loop.
   */
  if (localStorage.notificationInterval >>> 0 === parseFloat(localStorage.notificationInterval)) {
    interval = localStorage.notificationInterval * 60 * 1000

    setInterval(function() {
      notificationMessage = 'Get to work!'

      if ($scope.activeTask && $scope.activeTask.active) {
        notificationMessage = $scope.activeTask.issue_key + ' - ' + $scope.activeTask.task
        notificationMessage += '\nTime used: ' + $scope.timeTotal($scope.activeTask)
      }

      var notif = new window.Notification('Thyme', {
        body: notificationMessage,
        silent: true
      })
    }, interval)
  }
})
