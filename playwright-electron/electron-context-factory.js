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
}

module.exports = { ElectronContextFactory };
