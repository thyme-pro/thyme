// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
//
const ipc = require('electron').ipcRenderer;

document.ondragover = document.ondrop = (ev) => {
  ev.preventDefault();
};

document.body.ondrop = (ev) => {
  ipc.send('open-file', ev.dataTransfer.files[0].path);
  ev.preventDefault();
};

const path = require('path');

window.$ = require(path.join(__dirname, 'vendor/jquery/dist/jquery.min.js'));
window.XDate = require(path.join(__dirname, 'vendor/xdate/xdate.js'));


require(path.join(__dirname, 'vendor/underscore/underscore.js'));

require(path.join(__dirname, 'js/helper/time.js'));

require(path.join(__dirname, 'vendor/date/date.js'));

require(path.join(__dirname, 'vendor/angular/angular.js'));
require(path.join(__dirname, 'vendor/angular-route/angular-route.js'));
require(path.join(__dirname, 'vendor/angular-bootstrap/ui-bootstrap.js'));
require(path.join(__dirname, 'vendor/angular-bootstrap/ui-bootstrap-tpls.js'));
