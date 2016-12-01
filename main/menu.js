module.exports = {
  init,
  onWindowBlur,
  onWindowFocus
}

const electron = require('electron')
const {shell} = electron
const {app} = electron
const path = require('path')
const windows = require('./windows')
const config = require('../config')

var menu

function init () {
  menu = electron.Menu.buildFromTemplate(getMenuTemplate())
  electron.Menu.setApplicationMenu(menu)
}

function onToggleAlwaysOnTop (flag) {
  getMenuItem('Float on Top').checked = flag
}

function onToggleFullScreen (flag) {
  getMenuItem('Full Screen').checked = flag
}

function onWindowBlur () {
  getMenuItem('Full Screen').enabled = false
  getMenuItem('Float on Top').enabled = false
}

function onWindowFocus () {
  getMenuItem('Full Screen').enabled = true
  getMenuItem('Float on Top').enabled = true
}

function getMenuItem (label) {
  for (var i = 0; i < menu.items.length; i++) {
    var menuItem = menu.items[i].submenu.items.find(function (item) {
      return item.label === label
    })
    if (menuItem) return menuItem
  }
}

function getMenuTemplate () {
  var template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New worklog',
          accelerator: 'CmdOrCtrl+n',
          click: () => windows.worklog.init()
        },
        {
          type: 'separator'
        },
        {
          label: process.platform === 'win32'
            ? 'Close'
            : 'Close Window',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => windows.preferences.init()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Full Screen',
          type: 'checkbox',
          accelerator: process.platform === 'darwin'
            ? 'Ctrl+Command+F'
            : 'F11',
         // click: () => windows.main.toggleFullScreen()
        },
        {
          label: 'Float on Top',
          type: 'checkbox',
        //  click: () => windows.main.toggleAlwaysOnTop()
        },
        {
          type: 'separator'
        },
        {
          type: 'separator'
        },
        {
          label: 'Developer',
          submenu: [
            {
              label: 'Developer Tools',
              accelerator: process.platform === 'darwin'
                ? 'Alt+Command+I'
                : 'Ctrl+Shift+I',
          //    click: () => windows.main.toggleDevTools()
            },
          ]
        }
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        {
          label: 'Learn more about ' + config.APP_NAME,
          click: () => shell.openExternal(config.HOME_PAGE_URL)
        },
        {
          label: 'Contribute on GitHub',
          click: () => shell.openExternal(config.GITHUB_URL)
        },
        {
          type: 'separator'
        },
        {
          label: 'Report an Issue...',
          click: () => shell.openExternal(config.GITHUB_URL_ISSUES)
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: config.APP_NAME,
      submenu: [
        {
          label: 'About ' + config.APP_NAME,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => windows.preferences.init()
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide ' + config.APP_NAME,
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Alt+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => app.quit()
        }
      ]
    })

    // Add Window menu (OS X)
    template.splice(5, 0, {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          role: 'front'
        }
      ]
    })
  }

  // On Windows and Linux, open dialogs do not support selecting both files and
  // folders and files, so add an extra menu item so there is one for each type.
  if (process.platform === 'linux' || process.platform === 'win32') {
    // Help menu (Windows, Linux)
    template[4].submenu.push(
      {
        type: 'separator'
      },
      {
        label: 'About ' + config.APP_NAME,
     //   click: () => windows.about.init()
      }
    )
  }
  // Add "File > Quit" menu item so Linux distros where the system tray icon is
  // missing will have a way to quit the app.
  if (process.platform === 'linux') {
    // File menu (Linux)
    template[0].submenu.push({
      label: 'Quit',
      click: () => app.quit()
    })
  }

  return template
}
