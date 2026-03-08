const { app, BrowserWindow } = require("electron");

// disable GPU compositing — prevents 0-width viewport on Linux CI (xvfb)
// see https://github.com/electron/electron/issues/31992
if (process.env.CI) app.disableHardwareAcceleration();

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL(
    'data:text/html,<html><body><h1 id="title">hello from electron</h1><input id="name" type="text" placeholder="enter name" /><button id="submit">submit</button></body></html>',
  );
});
