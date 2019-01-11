const electron = require('electron');
// Module to control application life.
const {app} = electron;
// Module to create native browser window.
const {BrowserWindow} = electron;
const {dialog} = electron;
const {ipcMain} = electron;
const {session} = electron;

const path = require('path');
const fs = require('fs');

const menu = require('./main/menu.js');
const windows = require('./main/windows');
//const tray = require('./main/tray.js')

const config = require('./config.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  mainWindow.loadURL(config.WINDOW_MAIN);

  if (config.IS_DEV) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = 'thyme.pro';
    callback({cancel: false, requestHeaders: details.requestHeaders});
  });

  menu.init();
}

const shouldQuit = app.makeSingleInstance((commandLine) => {
  checkArgs(commandLine);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

if (shouldQuit) {
  app.quit();
}

function openFile(path) {
  let data = fs.readFileSync(path, 'utf-8');

  try {
    let obj = JSON.parse(data);

    // Start issue with:
    mainWindow.webContents.send('save-worklog', {obj: obj});
    mainWindow.focus();

  } catch (exception) {
    dialog.showErrorBox('Error opening file', 'File could not be parsed' + '\n\n' + exception);
  }
}

function checkArgs(args) {
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];

    if (arg.indexOf('.thyme') != -1) {
      openFile(path.join(process.cwd(), arg));
    }
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.on('open-file', function (event, path) {
  openFile(path);
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('open-file', function (event, data) {
  openFile(data);
});

ipcMain.on('save-worklog', function (event, data) {
  console.log(data)
  mainWindow.webContents.send('save-worklog', {obj: data});
  mainWindow.focus();
});

ipcMain.on('start-worklog', function (event, data) {
  console.log(data)
  mainWindow.webContents.send('start-worklog', {obj: data});
});

ipcMain.on('edit-worklog', function (event, data) {
  windows.worklog.init(data);
});
