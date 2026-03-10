import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initFirebase, startListening, stopListening, getStores } from './printService'

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'Giặt Sấy Online - Print',
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (e) => {
    const choice = require('electron').dialog.showMessageBoxSync(mainWindow as BrowserWindow, {
      type: 'question',
      buttons: ['Thoát', 'Hủy'],
      title: 'Xác nhận',
      message: 'Bạn có chắc chắn muốn thoát ứng dụng?',
      detail: 'Nếu thoát, ứng dụng sẽ dừng lắng nghe và không tự động in hóa đơn nữa.',
      defaultId: 1,
      cancelId: 1
    })

    if (choice === 1) {
      e.preventDefault() // User clicked 'Hủy'
    }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.giatsayonline.printapp')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize Firebase Admin
  const fbResult = initFirebase()
  
  // IPC Handlers for React Frontend
  ipcMain.handle('init-firebase', () => fbResult)
  ipcMain.handle('get-stores', () => getStores())
  
  ipcMain.handle('start-listening', (_, storeId: string) => {
    const success = startListening(storeId, 
      (jobId, orderCode) => {
        mainWindow?.webContents.send('print-job-start', { jobId, orderCode })
      },
      (jobId, status, msg) => {
        mainWindow?.webContents.send('print-job-end', { jobId, status, msg })
      }
    )
    return success
  })

  ipcMain.handle('stop-listening', () => {
    stopListening()
    return true
  })

  createWindow()

  // Tự động mở trang POS trên trình duyệt mặc định
  shell.openExternal('https://giatsayonnline.vercel.app/pos')

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopListening()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
