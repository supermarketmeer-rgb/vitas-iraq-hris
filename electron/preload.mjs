import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  enterFullscreen: () => ipcRenderer.invoke('enter-fullscreen'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  exitFullscreen: () => ipcRenderer.invoke('exit-fullscreen'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  isDesktop: true
});
