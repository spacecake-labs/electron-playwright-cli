const { app, BrowserWindow } = require("electron");

// disable GPU compositing — prevents 0-width viewport on Linux CI (xvfb)
if (process.env.CI) app.disableHardwareAcceleration();

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 800, height: 600 });
  // load a page that adds class="ready" to body after 1.5s.
  // without waitForFunction, the class wouldn't be present at snapshot time.
  win.loadURL(
    'data:text/html,<html><body><h1>function test</h1><script>setTimeout(() => { document.body.classList.add("ready"); }, 1500);</script></body></html>',
  );
});
