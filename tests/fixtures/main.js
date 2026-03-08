const { app, BrowserWindow } = require("electron");

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL(
    'data:text/html,<html><body><h1 id="title">hello from electron</h1><input id="name" type="text" placeholder="enter name" /><button id="submit">submit</button></body></html>',
  );
});
