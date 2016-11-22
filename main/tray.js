module.exports = {
  init
}

const config = require('../config')
const path = require('path')
const electron = require('electron')
const {app,Menu,Tray} = electron

function init () {
  const iconPath = config.TRAY_ICON_PATH

  appIcon = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([{
    label: 'Show',
    click: function () {
      event.sender.send('tray-removed')
    }
  }])

  appIcon.setToolTip(config.APP_NAME)
  appIcon.setContextMenu(contextMenu)
}
