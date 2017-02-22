let preferences = module.exports = {
  init,
  win: null
};

const url = require('url');
const path = require('path');
const config = require('../../config');

const electron = require('electron');

const BrowserWindow = electron.BrowserWindow;

function init() {
  if (preferences.win) {
    return preferences.win.show();
  }

  let win = preferences.win = new BrowserWindow({
    width: 660,
    height: 370,
    show: false,
    resizable: false
  });

  win.loadURL(config.WINDOW_PREFERENCES);

  if (config.IS_DEV) {
    win.webContents.openDevTools();
  }

  // No menu on the About window
  win.setMenu(null);

  win.webContents.on('did-finish-load', function() {
    win.show();
  });

  win.once('closed', function() {
    preferences.win = null;
  });
}
