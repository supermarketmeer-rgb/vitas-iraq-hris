import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  enterFullscreen: () => ipcRenderer.invoke('enter-fullscreen'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  isDesktop: true
});
