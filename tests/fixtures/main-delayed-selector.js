const { app, BrowserWindow } = require("electron");

// disable GPU compositing — prevents 0-width viewport on Linux CI (xvfb)
if (process.env.CI) app.disableHardwareAcceleration();

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  // load a page with empty body, then inject #title after 1.5s.
  // without waitForSelector, a snapshot taken immediately would miss it.
  win.loadURL(
    'data:text/html,<html><body><p id="placeholder">loading...</p><script>setTimeout(() => { const h1 = document.createElement("h1"); h1.id = "title"; h1.textContent = "delayed content arrived"; document.body.appendChild(h1); }, 1500);</script></body></html>',
  );
});
