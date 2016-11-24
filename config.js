const path = require('path')
const fs = require('fs')

let APP_NAME = 'Thyme'
let APP_VERSION = require('./package.json').version

module.exports = {
  APP_NAME: APP_NAME,
  APP_VERSION: APP_VERSION,

  IS_DEV: false,

  HOME_PAGE_URL: 'http://thyme.pro',
  GITHUB_URL: 'https://github.com/thyme-pro/thyme',
  GITHUB_URL_ISSUES: 'https://github.com/thyme-pro/issues',

  TRAY_ICON_PATH: path.join(__dirname, 'img', 'trayTemplate.png'),

  WINDOW_MAIN: 'file://' + path.join(__dirname, 'index.html'),
  WINDOW_PREFERENCES: 'file://' + path.join(__dirname, 'templates', 'preferences.html'),
  WINDOW_NOTIFICATIONS: 'file://' + path.join(__dirname, 'templates', 'notifications.html')
}
