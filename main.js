const { app, BrowserWindow, ipcMain } = require('electron');
const http = require('http');
const next = require('next');
const { loadEnvConfig } = require('@next/env');
const fs = require('fs');
const path = require('path');

let mainWindow;
let nextServer;
let nextApp;

const APP_PORT = process.env.PORT || '3000';

const getLogPath = () => {
  try {
    return path.join(app.getPath('userData'), 'main.log');
  } catch {
    return path.join(process.cwd(), 'main.log');
  }
};

const log = (message) => {
  const line = `[${new Date().toISOString()}] ${message}`;
  try {
    fs.appendFileSync(getLogPath(), `${line}\n`);
  } catch {
    // Best-effort logging only.
  }
  console.log(line);
};

const startBundledNextServer = async () => {
  if (nextServer) {
    log('Next server already running, skipping startup.');
    return;
  }

  const projectRoot = __dirname;
  log(`Starting bundled Next server from: ${projectRoot}`);
  loadEnvConfig(projectRoot);

  nextApp = next({
    dev: false,
    dir: projectRoot,
  });

  const handle = nextApp.getRequestHandler();
  log('Calling nextApp.prepare()');
  await Promise.race([
    nextApp.prepare(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('nextApp.prepare() timed out after 60s')), 60000);
    }),
  ]);
  log('nextApp.prepare() completed');

  await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => handle(req, res));
    server.once('error', reject);
    server.listen(APP_PORT, '127.0.0.1', () => {
      nextServer = server;
      log(`Bundled Next server listening on http://127.0.0.1:${APP_PORT}`);
      resolve();
    });
  });
};

const createWindow = async () => {
  try {
    const isDev = !app.isPackaged;
    log(`createWindow start. isDev=${isDev}`);

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
      },
    });

    if (!isDev) {
      await startBundledNextServer();
    }

    const startUrl = isDev
      ? (process.env.ELECTRON_START_URL || 'http://localhost:3000')
      : `http://127.0.0.1:${APP_PORT}`;

    log(`Loading URL: ${startUrl}`);
    await mainWindow.loadURL(startUrl);

    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (error) {
    log(`createWindow failed: ${error.stack || error.message}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      const safeError = encodeURIComponent(String(error.stack || error.message));
      mainWindow.loadURL(`data:text/plain,Overwatch startup failed.%0A%0A${safeError}`);
    }
  }
};

app.on('ready', createWindow);

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason && reason.stack ? reason.stack : reason}`);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.stack || error.message}`);
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.close();
    nextServer = null;
    nextApp = null;
  }

  // On OS X it is common for applications to stay active until the user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for main process
ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    isPackaged: app.isPackaged,
  };
});
