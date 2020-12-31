const { app, Menu, BrowserWindow } = require('electron')
const ipc = require('electron').ipcMain
const dialog = require('electron').dialog


ipc.on('open-file-dialog', (event) => {
  const options = {
    properties: ['openFile']
  }
  const pathes = dialog.showOpenDialogSync(options)
  if(pathes != null && pathes.length > 0) {
    event.sender.send('selected-file', pathes[0])
  }
})

ipc.on('save-dialog', (event) => {
  const options = {
    title: 'Save',
    filters: [
      {
        name: 'Data',
        extensions: ['.json']
      }
    ]
  }
  
  const path = dialog.showSaveDialogSync(options);
  if( path != null ) {
    event.sender.send('saved-file', path)
  }
})


function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadURL('file://' + __dirname + '/index.html');
  //win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})


// ElectronのMenuの設定
const templateMenu = [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'Open',
        accelerator: 'CmdOrCtrl+O',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'open-file'
          )
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'save'
          )
        }
      },
      {
        role: 'close'
      },
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'undo'
          )
        }
      },
      {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Shift+Z',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'redo'
          )
        }
      },
      {
        type: 'separator',
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'cut'
          )
        }        
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'copy'
          )
        }
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'paste'
          )
        }
      },
      {
        type: 'separator',
      },
      {
        label: 'Duplicate',
        accelerator: 'CmdOrCtrl+D',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'duplicate'
          )
        }
      },
      {
        type: 'separator',
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: (menuItem, browserWindow, event) => {
          browserWindow.webContents.send(
            'request', 'selectall'
          )
        }
      },
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        role: 'reload',
      },
      {
        type: 'separator',
      },
      {
        role: 'resetzoom',
      },
      {
        role: 'zoomin',
      },
      {
        role: 'zoomout',
      },
      {
        type: 'separator',
      },
      {
        role: 'togglefullscreen',
      },
      {
        role:
        'toggleDevTools'
      },      
    ]
  }
]

const menu = Menu.buildFromTemplate(templateMenu)
Menu.setApplicationMenu(menu)
