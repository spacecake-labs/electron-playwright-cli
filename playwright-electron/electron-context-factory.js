"use strict";

// electron context factory — launches an electron app and returns
// its browser context for the playwright CLI daemon.

const playwright = require("playwright-core");

class ElectronContextFactory {
  constructor(config) {
    this.config = config;
  }

  async createContext(_clientInfo, _abortSignal, _options) {
    const launchOptions = this.config.browser.launchOptions || {};
    const electronApp = await playwright._electron.launch({
      executablePath: launchOptions.executablePath,
      args: launchOptions.args || ["."],
      cwd: launchOptions.cwd || process.cwd(),
      env: launchOptions.env
        ? { ...process.env, ...launchOptions.env }
        : undefined,
      timeout: launchOptions.timeout,
    });

    try {
      const browserContext = electronApp.context();
      // store the electron app reference on the context for tools
      // @ts-ignore — custom property used by electron-tools.js
      browserContext._electronApp = electronApp;

      // if there are no pages yet, wait for the first window
      if (browserContext.pages().length === 0) {
        await electronApp.firstWindow();
      }

      // wait for the page to be ready before handing it off —
      // without this, screenshots taken immediately can capture a blank page
      const firstPage = browserContext.pages()[0];
      if (firstPage) {
        await this._waitForReady(firstPage);
      }

      electronApp.process().on("exit", () => {
        setTimeout(() => process.exit(0), 1000);
      });

      return {
        browserContext,
        close: async () => {
          await electronApp.close().catch(() => {});
        },
      };
    } catch (e) {
      await electronApp.close().catch(() => {});
      throw e;
    }
  }

  // waits for the app to be ready using either user-provided conditions
  // from config.browser.readyCondition, or a sensible default.
  //
  // config example:
  //   "readyCondition": {
  //     "waitForLoadState": "load",
  //     "waitForSelector": "[data-testid='app-ready']",
  //     "waitForFunction": "document.fonts.ready",
  //     "timeout": 10000
  //   }
  async _waitForReady(page) {
    const ready = this.config.browser?.readyCondition ?? {};
    const timeout = ready.timeout ?? 10000;

    // if user provided custom conditions, use those
    if (ready.waitForLoadState || ready.waitForSelector || ready.waitForFunction) {
      if (ready.waitForLoadState) {
        await page
          .waitForLoadState(ready.waitForLoadState, { timeout })
          .catch(() => {});
      }
      if (ready.waitForSelector) {
        await page
          .waitForSelector(ready.waitForSelector, { state: "visible", timeout })
          .catch(() => {});
      }
      if (ready.waitForFunction) {
        await page
          .waitForFunction(ready.waitForFunction, null, { timeout })
          .catch(() => {});
      }
    } else {
      // default: wait for load event (all resources loaded)
      await page.waitForLoadState("load", { timeout }).catch(() => {});
    }

    // always wait for at least one paint frame to ensure pixels are rendered
    await page
      .evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      )
      .catch(() => {});
  }
}

module.exports = { ElectronContextFactory };
