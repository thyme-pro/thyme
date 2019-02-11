const path = require('path');

let APP_NAME = 'Thyme';
let APP_VERSION = require('./package.json').version;

let IS_DEV = false;

if (process.env.THYME_ENABLE_DEV) {
  IS_DEV = (process.env.THYME_ENABLE_DEV == 'true') ? true : false;
}

module.exports = {
  APP_NAME: APP_NAME,
  APP_VERSION: APP_VERSION,

  ROOT_DIR: __dirname,

  IS_DEV: IS_DEV,

  HOME_PAGE_URL: 'http://thyme.pro',
  GITHUB_URL: 'https://github.com/thyme-pro/thyme',
  GITHUB_URL_ISSUES: 'https://github.com/thyme-pro/thyme/issues',

  TRAY_ICON_PATH: path.join(__dirname, 'img', 'trayTemplate.png'),

  WINDOW_MAIN: path.join(__dirname, 'index.html'),
  WINDOW_PREFERENCES: path.join(__dirname, 'templates', 'preferences.html'),
  WINDOW_WORKLOG: path.join(__dirname, 'templates', 'worklog.html')
};
