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

window.$ = require('jquery');

window.XDate = require('xdate');

require(path.join(__dirname, 'js/helper/time.js'));

require('angular');
require('angular-bootstrap');
