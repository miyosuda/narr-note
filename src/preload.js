const electron = require('electron')
const fs = require('fs')
const path = require('path')

process.once('loaded', () => {
  // TODO:
  global.ipc = electron.ipcRenderer
  global.fs = fs
  global.path = path
})
