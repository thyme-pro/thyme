// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
//
const ipc = require('electron').ipcRenderer

document.ondragover = document.ondrop = (ev) => {
  ev.preventDefault()
}

document.body.ondrop = (ev) => {
  ipc.send('open-file', ev.dataTransfer.files[0].path)
  ev.preventDefault()
}

const path = require('path')

window.$ = require(path.join(__dirname, 'vendor/jquery/dist/jquery.min.js'))
window.XDate = require(path.join(__dirname, 'vendor/xdate/xdate.js'))

require(path.join(__dirname, 'vendor/underscore/underscore.js'));
require(path.join(__dirname, 'vendor/date/date.js'));

require(path.join(__dirname, 'vendor/angular/angular.js'))
require(path.join(__dirname, 'vendor/angular-route/angular-route.js'))
require(path.join(__dirname, 'vendor/angular-bootstrap/ui-bootstrap.js'))
require(path.join(__dirname, 'vendor/angular-bootstrap/ui-bootstrap-tpls.js'))

/**
* Calculate number of minutes in formatted time (00:10).
*/
window.get_minutes_from_time = (time) => {
  var split_time = time.split(':');

  return (parseInt(split_time[0]) * 60) + parseInt(split_time[1]);
}

/**
* Format pretty time info hh:mm from minutes.
*/
window.format_minutes_to_time = (minutes) => {
  if (isNaN(minutes)) {
    return;
  }

  time_hours = Math.floor(minutes / 60);
  if (time_hours < 10) {
    time_hours = "0" + time_hours;
  }

  time_minutes = Math.ceil(minutes % 60);
  if (time_minutes < 10) {
    time_minutes = "0" + time_minutes;
  }

  return time_hours + ':' + time_minutes;
}

window.calculate_total_for_task = (task) => {
  var total_diff = calculate_total_minutes_for_task(task);

  return format_minutes_to_time(total_diff);
}

window.calculate_total_minutes_for_task = (task) => {
  var total_diff = 0;
  if (task) {
    angular.forEach(task.time_entries, function(value, key) {
      var minutes = calculate_minutes_for_time_entry(value);
      total_diff += minutes;
    });
  }

  return total_diff;
}

window.calculate_minutes_for_time_entry = (time_entry) => {
  var start = XDate(time_entry.start);

  var stop = XDate();
  if (time_entry.stop) {
    stop = XDate(time_entry.stop);
  }

  var minutes = 0;
  var diff = Math.floor(start.diffMinutes(stop));
  if (!isNaN(diff)) {
    minutes = diff;
  }

  return minutes;
}

window.time_converter = (timestamp) => {
  var a = new Date(timestamp);
  var year = a.getFullYear();
  var month = a.getMonth() + 1;
  var date = ('0' + a.getDate()).slice(-2);
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = year + '-' + month + '-' + date + 'T' + hour + ':' + min + ':' + sec + '.000+0100';
  return time;
}
