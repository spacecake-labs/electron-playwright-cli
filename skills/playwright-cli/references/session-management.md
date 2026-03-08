# Session Management

Run multiple isolated Electron app sessions concurrently with state persistence.

## Named Sessions

Use `-s` flag to isolate Electron app instances:

```bash
# Session 1: Main app interaction
electron-playwright-cli -s=main snapshot

# Session 2: Separate instance (independent cookies, storage)
electron-playwright-cli -s=secondary snapshot

# Commands are isolated by session
electron-playwright-cli -s=main fill e1 "user@example.com"
electron-playwright-cli -s=secondary click e3
```

## Session Isolation Properties

Each session has independent:
- Cookies
- LocalStorage / SessionStorage
- IndexedDB
- Cache
- Open windows

## Session Commands

```bash
# List all sessions
electron-playwright-cli list

# Stop a session (close the Electron app)
electron-playwright-cli close                # stop the default session
electron-playwright-cli -s=mysession close   # stop a named session

# Stop all sessions
electron-playwright-cli close-all

# Forcefully kill all daemon processes (for stale/zombie processes)
electron-playwright-cli kill-all

# Delete session user data (profile directory)
electron-playwright-cli delete-data                # delete default session data
electron-playwright-cli -s=mysession delete-data   # delete named session data
```

## Environment Variable

Set a default session name via environment variable:

```bash
export PLAYWRIGHT_CLI_SESSION="mysession"
electron-playwright-cli snapshot  # Uses "mysession" automatically
```

## Common Patterns

### Multiple App Instances

```bash
# Launch two instances of your Electron app
electron-playwright-cli -s=instance1 snapshot
electron-playwright-cli -s=instance2 snapshot

# Interact with each independently
electron-playwright-cli -s=instance1 fill e1 "user-a@example.com"
electron-playwright-cli -s=instance2 fill e1 "user-b@example.com"

# Compare screenshots
electron-playwright-cli -s=instance1 screenshot --filename=instance1.png
electron-playwright-cli -s=instance2 screenshot --filename=instance2.png

# Cleanup
electron-playwright-cli close-all
```

### Testing Different App States

```bash
# Test with different configurations or data
electron-playwright-cli -s=fresh snapshot
electron-playwright-cli -s=with-data snapshot

# Take screenshots for comparison
electron-playwright-cli -s=fresh screenshot
electron-playwright-cli -s=with-data screenshot
```

## Default Session

When `-s` is omitted, commands use the default session:

```bash
# These use the same default session
electron-playwright-cli snapshot
electron-playwright-cli click e3
electron-playwright-cli close  # Stops the default session
```

## Session Configuration

Configure a session with a specific config file:

```bash
# Use a custom config file
electron-playwright-cli --config=.playwright/my-cli.json snapshot
```

## Best Practices

### 1. Name Sessions Semantically

```bash
# GOOD: Clear purpose
electron-playwright-cli -s=login-test snapshot
electron-playwright-cli -s=settings-test snapshot

# AVOID: Generic names
electron-playwright-cli -s=s1 snapshot
```

### 2. Always Clean Up

```bash
# Stop sessions when done
electron-playwright-cli -s=login-test close
electron-playwright-cli -s=settings-test close

# Or stop all at once
electron-playwright-cli close-all

# If sessions become unresponsive or zombie processes remain
electron-playwright-cli kill-all
```

### 3. Delete Stale Session Data

```bash
# Remove old session data to free disk space
electron-playwright-cli -s=oldsession delete-data
```
