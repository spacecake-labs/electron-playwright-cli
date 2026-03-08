"use strict";

// electron-specific tools for the playwright CLI daemon.
// operate on the electron app instance stored on browserContext._electronApp.

const { z } = require("playwright-core/lib/mcpBundle");

const electronEvaluate = {
  capability: "core",
  schema: {
    name: "electron_evaluate",
    title: "Evaluate in Electron main process",
    description:
      "Execute a JavaScript expression in the Electron main process. The function receives the Electron module as its argument.",
    inputSchema: z.object({
      expression: z
        .string()
        .describe(
          'JavaScript expression to evaluate in the main process. Receives electron module as argument, e.g. "electron => electron.app.getName()"',
        ),
    }),
    type: "destructive",
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    const electronApp = browserContext._electronApp;
    if (!electronApp)
      throw new Error(
        "Not running in Electron mode. This tool requires an Electron app context.",
      );

    const result = await electronApp.evaluate(params.expression);
    const text = JSON.stringify(result, null, 2) ?? "undefined";
    response.addTextResult(text);
  },
};

const electronWindows = {
  capability: "core",
  schema: {
    name: "electron_windows",
    title: "List Electron windows",
    description:
      "List all open Electron windows with their title, URL, and index.",
    inputSchema: z.object({}),
    type: "readOnly",
  },
  handle: async (context, params, response) => {
    const browserContext = await context.ensureBrowserContext();
    const electronApp = browserContext._electronApp;
    if (!electronApp)
      throw new Error(
        "Not running in Electron mode. This tool requires an Electron app context.",
      );

    const windows = electronApp.windows();
    const windowInfos = await Promise.all(
      windows.map(async (page, index) => ({
        index,
        title: await page.title(),
        url: page.url(),
      })),
    );
    const text = JSON.stringify(windowInfos, null, 2);
    response.addTextResult(text);
  },
};

module.exports = [electronEvaluate, electronWindows];
