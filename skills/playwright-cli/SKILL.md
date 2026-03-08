---
name: electron-playwright-cli
description: Automates Electron desktop app interactions for testing, screenshots, and data extraction. Use when the user needs to interact with Electron apps, take screenshots, fill forms, click elements, or extract information from desktop applications.
allowed-tools: Bash(electron-playwright-cli:*)
---

# Electron App Automation with electron-playwright-cli

## Quick start

```bash
# take a snapshot of the running electron app (launches via config on first command)
electron-playwright-cli snapshot
# interact with the page using refs from the snapshot
electron-playwright-cli click e15
electron-playwright-cli type "search query"
electron-playwright-cli press Enter
```

## Configuration

Create `.playwright/cli.config.json` in your project root:

```json
{
  "browser": {
    "launchOptions": {
      "args": ["path/to/your/main.js"]
    }
  }
}
```

The `args` array is passed to Electron. Point it at your app's main process entry point.

The daemon shuts down automatically when the Electron app closes (via `close` or the app exiting on its own). The next command spawns a fresh daemon that reads the current config from disk, so config changes take effect immediately — no need to manually kill the daemon.

Optional launch options:
- `executablePath`: path to the Electron binary (defaults to the one in node_modules)
- `cwd`: working directory for the Electron process
- `env`: additional environment variables
- `timeout`: launch timeout in milliseconds

### App readiness

By default, the CLI waits for the `load` event and a paint frame before accepting commands. For apps with async rendering (React, etc.), use `readyCondition` to tell the CLI when your app is actually ready:

```json
{
  "browser": {
    "launchOptions": {
      "args": ["main.js"]
    },
    "readyCondition": {
      "waitForSelector": "[data-testid='app-ready']",
      "timeout": 10000
    }
  }
}
```

Available options (all optional, can be combined):

| Option | Type | Description |
|---|---|---|
| `waitForSelector` | CSS selector | Waits for the element to be visible |
| `waitForFunction` | JS expression | Waits for the expression to return truthy (e.g. `"document.fonts.ready"`) |
| `waitForLoadState` | `"load"` \| `"domcontentloaded"` \| `"networkidle"` | Waits for the specified load state |
| `timeout` | number (ms) | Timeout for all conditions (default: 10000) |

## Commands

### Core

```bash
electron-playwright-cli type "search query"
electron-playwright-cli click e3
electron-playwright-cli dblclick e7
electron-playwright-cli fill e5 "user@example.com"
electron-playwright-cli drag e2 e8
electron-playwright-cli hover e4
electron-playwright-cli select e9 "option-value"
electron-playwright-cli upload ./document.pdf
electron-playwright-cli check e12
electron-playwright-cli uncheck e12
electron-playwright-cli snapshot
electron-playwright-cli snapshot --filename=after-click.yaml
electron-playwright-cli eval "document.title"
electron-playwright-cli eval "el => el.textContent" e5
electron-playwright-cli dialog-accept
electron-playwright-cli dialog-accept "confirmation text"
electron-playwright-cli dialog-dismiss
electron-playwright-cli resize 1920 1080
electron-playwright-cli close
```

### Navigation

Navigate within the Electron app's webview:

```bash
electron-playwright-cli goto https://example.com
electron-playwright-cli go-back
electron-playwright-cli go-forward
electron-playwright-cli reload
```

### Keyboard

```bash
electron-playwright-cli press Enter
electron-playwright-cli press ArrowDown
electron-playwright-cli keydown Shift
electron-playwright-cli keyup Shift
```

### Mouse

```bash
electron-playwright-cli mousemove 150 300
electron-playwright-cli mousedown
electron-playwright-cli mousedown right
electron-playwright-cli mouseup
electron-playwright-cli mouseup right
electron-playwright-cli mousewheel 0 100
```

### Save as

```bash
electron-playwright-cli screenshot
electron-playwright-cli screenshot e5
electron-playwright-cli screenshot --filename=page.png
```

### Tabs

```bash
electron-playwright-cli tab-list
electron-playwright-cli tab-new
electron-playwright-cli tab-close
electron-playwright-cli tab-close 2
electron-playwright-cli tab-select 0
```

### Storage

```bash
electron-playwright-cli state-save
electron-playwright-cli state-save auth.json
electron-playwright-cli state-load auth.json

# Cookies
electron-playwright-cli cookie-list
electron-playwright-cli cookie-list --domain=example.com
electron-playwright-cli cookie-get session_id
electron-playwright-cli cookie-set session_id abc123
electron-playwright-cli cookie-set session_id abc123 --domain=example.com --httpOnly --secure
electron-playwright-cli cookie-delete session_id
electron-playwright-cli cookie-clear

# LocalStorage
electron-playwright-cli localstorage-list
electron-playwright-cli localstorage-get theme
electron-playwright-cli localstorage-set theme dark
electron-playwright-cli localstorage-delete theme
electron-playwright-cli localstorage-clear

# SessionStorage
electron-playwright-cli sessionstorage-list
electron-playwright-cli sessionstorage-get step
electron-playwright-cli sessionstorage-set step 3
electron-playwright-cli sessionstorage-delete step
electron-playwright-cli sessionstorage-clear
```

### Network

```bash
electron-playwright-cli route "**/*.jpg" --status=404
electron-playwright-cli route "https://api.example.com/**" --body='{"mock": true}'
electron-playwright-cli route-list
electron-playwright-cli unroute "**/*.jpg"
electron-playwright-cli unroute
```

### DevTools

```bash
electron-playwright-cli console
electron-playwright-cli console warning
electron-playwright-cli network
electron-playwright-cli run-code "async page => await page.context().grantPermissions(['geolocation'])"
electron-playwright-cli tracing-start
electron-playwright-cli tracing-stop
electron-playwright-cli video-start
electron-playwright-cli video-stop video.webm
```

### Electron

```bash
electron-playwright-cli electron_evaluate "electron => electron.app.getName()"
electron-playwright-cli electron_evaluate "electron => electron.app.getPath('userData')"
electron-playwright-cli electron_windows
```

## Snapshots

After each command, electron-playwright-cli provides a snapshot of the current app state.

```bash
> electron-playwright-cli snapshot
### Page
- Page URL: file:///path/to/index.html
- Page Title: My Electron App
### Snapshot
[Snapshot](.playwright-cli/page-2026-02-14T19-22-42-679Z.yml)
```

You can also take a snapshot on demand using `electron-playwright-cli snapshot` command.

If `--filename` is not provided, a new snapshot file is created with a timestamp. Default to automatic file naming, use `--filename=` when artifact is a part of the workflow result.

## Sessions

```bash
electron-playwright-cli -s=name <cmd>            # run command in named session
electron-playwright-cli -s=name close            # stop a named session
electron-playwright-cli -s=name delete-data      # delete user data for named session
electron-playwright-cli list                     # list all sessions
electron-playwright-cli close-all                # close all sessions
electron-playwright-cli kill-all                 # forcefully kill all daemon processes
```

## Local installation

In some cases you might want to install electron-playwright-cli locally. It requires `playwright` as a peer dependency. If running the globally available `electron-playwright-cli` binary fails, use `npx electron-playwright-cli` to run the commands. For example:

```bash
npx electron-playwright-cli snapshot
npx electron-playwright-cli click e1
```

## Example: Form submission

```bash
electron-playwright-cli snapshot

electron-playwright-cli fill e1 "user@example.com"
electron-playwright-cli fill e2 "password123"
electron-playwright-cli click e3
electron-playwright-cli snapshot
electron-playwright-cli close
```

## Example: Multi-window workflow

```bash
electron-playwright-cli electron_windows
electron-playwright-cli tab-select 0
electron-playwright-cli snapshot
electron-playwright-cli close
```

## Example: Debugging with DevTools

```bash
electron-playwright-cli snapshot
electron-playwright-cli click e4
electron-playwright-cli fill e7 "test"
electron-playwright-cli console
electron-playwright-cli network
electron-playwright-cli close
```

```bash
electron-playwright-cli tracing-start
electron-playwright-cli click e4
electron-playwright-cli fill e7 "test"
electron-playwright-cli tracing-stop
electron-playwright-cli close
```

## Example: Electron main process

```bash
electron-playwright-cli electron_evaluate "electron => electron.app.getName()"
electron-playwright-cli electron_evaluate "electron => electron.app.getPath('userData')"
electron-playwright-cli electron_windows
```

## Specific tasks

* **Request mocking** [references/request-mocking.md](references/request-mocking.md)
* **Running Playwright code** [references/running-code.md](references/running-code.md)
* **Session management** [references/session-management.md](references/session-management.md)
* **Storage state (cookies, localStorage)** [references/storage-state.md](references/storage-state.md)
* **Test generation** [references/test-generation.md](references/test-generation.md)
* **Tracing** [references/tracing.md](references/tracing.md)
* **Video recording** [references/video-recording.md](references/video-recording.md)
