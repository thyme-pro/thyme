var worklog = module.exports = {
  init,
  win: null
}

const url = require('url')
const path = require('path')
const config = require('../../config')

const electron = require('electron')
const {ipcMain} = electron

const {BrowserWindow} = electron

function init (worklogObj) {
  if (worklog.win) {
    return worklog.win.show()
  }

  var win = worklog.win = new BrowserWindow({
    width: 660,
    height: 370,
    show: false,
    resizable: false
  });

  win.loadURL(config.WINDOW_WORKLOG)

  if (config.IS_DEV) {
    win.webContents.openDevTools()
  }


  // No menu on the About window
  win.setMenu(null)

  win.webContents.on('did-finish-load', function () {
    win.show()

    if (worklogObj) {
      win.webContents.send('edit-worklog' , {obj:worklogObj})
    }
  })

  win.once('closed', function () {
    worklog.win = null
  })
}
