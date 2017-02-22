
(function(window) {'use strict';
    /**
    * Format pretty time info hh:mm from minutes.
    */
  function formatMinutesToTime(minutes) {
    if (isNaN(minutes)) {
      return;
    }

    let time_hours = Math.floor(minutes / 60);
    if (time_hours < 10) {
      time_hours = '0' + time_hours;
    }

    let time_minutes = Math.ceil(minutes % 60);
    if (time_minutes < 10) {
      time_minutes = '0' + time_minutes;
    }

    return time_hours + ':' + time_minutes;
  }

  function calculateMinutesForTimeEntry(time_entry) {
    let start = XDate(time_entry.start);

    let stop = XDate();
    if (time_entry.stop) {
      stop = XDate(time_entry.stop);
    }

    let minutes = 0;
    let diff = Math.floor(start.diffMinutes(stop));
    if (!isNaN(diff)) {
      minutes = diff;
    }

    return minutes;
  }

  function formattedTotalForWorklog(worklog) {
    let total_diff = calculateTotalForWorklog(worklog);

    return formatMinutesToTime(total_diff);
  }


  function calculateTotalForWorklog(task) {
    let total_diff = 0;

    if (task) {
      angular.forEach(task.time_entries, function(value) {
        let minutes = calculateMinutesForTimeEntry(value);
        total_diff += minutes;
      });
    }

    return total_diff;
  }

  function timeConverter(timestamp) {
    let a = new Date(timestamp);
    let year = a.getFullYear();
    let month = a.getMonth() + 1;
    let date = ('0' + a.getDate()).slice(-2);
    let hour = a.getHours();
    let min = a.getMinutes();
    let sec = a.getSeconds();
    let time = year + '-' + month + '-' + date + 'T' + hour + ':' + min + ':' + sec + '.000+0100';
    return time;
  }

  function parseTimeExpression(expression) {
    let minutes = {
      m: 1,
      min: 1,
      minute: 1,
      minutes: 1,
      h: 60,
      hour: 60,
      hours: 60,
    };

    let regex = /(\d+)\s*(m|min|minute|minutes|h|hour|hours)/g;
    let mins = 0;
    let m;
    let x;

    while ((m = regex.exec(expression))) {
      x = Number(m[1]) * (minutes[m[2]]||0);
      mins += x;
    }

    return x ? mins : NaN;
  }

  window.timeHelper = {
    'formatMinutesToTime': formatMinutesToTime,
    'formattedTotalForWorklog': formattedTotalForWorklog,
    'calculateTotalForWorklog': calculateTotalForWorklog,
    'calculateMinutesForTimeEntry': calculateMinutesForTimeEntry,
    'timeConverter': timeConverter,
    'parseTimeExpression': parseTimeExpression
  };

})(window);
