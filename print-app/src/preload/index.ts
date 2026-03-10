import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  initFirebase: () => ipcRenderer.invoke('init-firebase'),
  getStores: () => ipcRenderer.invoke('get-stores'),
  startListening: (storeId: string) => ipcRenderer.invoke('start-listening', storeId),
  stopListening: () => ipcRenderer.invoke('stop-listening'),
  onJobStart: (callback: (data: any) => void) => {
    ipcRenderer.on('print-job-start', (_, data) => callback(data))
  },
  onJobEnd: (callback: (data: any) => void) => {
    ipcRenderer.on('print-job-end', (_, data) => callback(data))
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
