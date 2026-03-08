# Storage Management

Manage cookies, localStorage, sessionStorage, and storage state in your Electron app.

## Storage State

Save and restore complete app state including cookies and storage.

### Save Storage State

```bash
# Save to auto-generated filename (storage-state-{timestamp}.json)
electron-playwright-cli state-save

# Save to specific filename
electron-playwright-cli state-save my-state.json
```

### Restore Storage State

```bash
# Load storage state from file
electron-playwright-cli state-load my-state.json

# Reload the app to apply
electron-playwright-cli reload
```

### Storage State File Format

The saved file contains:

```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123",
      "domain": "example.com",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": [
        { "name": "theme", "value": "dark" },
        { "name": "user_id", "value": "12345" }
      ]
    }
  ]
}
```

## Cookies

### List All Cookies

```bash
electron-playwright-cli cookie-list
```

### Filter Cookies by Domain

```bash
electron-playwright-cli cookie-list --domain=example.com
```

### Filter Cookies by Path

```bash
electron-playwright-cli cookie-list --path=/api
```

### Get Specific Cookie

```bash
electron-playwright-cli cookie-get session_id
```

### Set a Cookie

```bash
# Basic cookie
electron-playwright-cli cookie-set session abc123

# Cookie with options
electron-playwright-cli cookie-set session abc123 --domain=example.com --path=/ --httpOnly --secure --sameSite=Lax

# Cookie with expiration (Unix timestamp)
electron-playwright-cli cookie-set remember_me token123 --expires=1735689600
```

### Delete a Cookie

```bash
electron-playwright-cli cookie-delete session_id
```

### Clear All Cookies

```bash
electron-playwright-cli cookie-clear
```

### Advanced: Multiple Cookies or Custom Options

For complex scenarios like adding multiple cookies at once, use `run-code`:

```bash
electron-playwright-cli run-code "async page => {
  await page.context().addCookies([
    { name: 'session_id', value: 'sess_abc123', domain: 'example.com', path: '/', httpOnly: true },
    { name: 'preferences', value: JSON.stringify({ theme: 'dark' }), domain: 'example.com', path: '/' }
  ]);
}"
```

## Local Storage

### List All localStorage Items

```bash
electron-playwright-cli localstorage-list
```

### Get Single Value

```bash
electron-playwright-cli localstorage-get token
```

### Set Value

```bash
electron-playwright-cli localstorage-set theme dark
```

### Set JSON Value

```bash
electron-playwright-cli localstorage-set user_settings '{"theme":"dark","language":"en"}'
```

### Delete Single Item

```bash
electron-playwright-cli localstorage-delete token
```

### Clear All localStorage

```bash
electron-playwright-cli localstorage-clear
```

### Advanced: Multiple Operations

For complex scenarios like setting multiple values at once, use `run-code`:

```bash
electron-playwright-cli run-code "async page => {
  await page.evaluate(() => {
    localStorage.setItem('token', 'jwt_abc123');
    localStorage.setItem('user_id', '12345');
    localStorage.setItem('expires_at', Date.now() + 3600000);
  });
}"
```

## Session Storage

### List All sessionStorage Items

```bash
electron-playwright-cli sessionstorage-list
```

### Get Single Value

```bash
electron-playwright-cli sessionstorage-get form_data
```

### Set Value

```bash
electron-playwright-cli sessionstorage-set step 3
```

### Delete Single Item

```bash
electron-playwright-cli sessionstorage-delete step
```

### Clear sessionStorage

```bash
electron-playwright-cli sessionstorage-clear
```

## IndexedDB

### List Databases

```bash
electron-playwright-cli run-code "async page => {
  return await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return databases;
  });
}"
```

### Delete Database

```bash
electron-playwright-cli run-code "async page => {
  await page.evaluate(() => {
    indexedDB.deleteDatabase('myDatabase');
  });
}"
```

## Common Patterns

### Save and Restore App State

```bash
# Step 1: Set up the app state
electron-playwright-cli snapshot
electron-playwright-cli fill e1 "user@example.com"
electron-playwright-cli fill e2 "password123"
electron-playwright-cli click e3

# Save the state
electron-playwright-cli state-save app-state.json

# Step 2: Later, restore state and skip setup
electron-playwright-cli state-load app-state.json
electron-playwright-cli reload
# App state is restored!
```

### Inspect and Modify Storage

```bash
# Check current storage
electron-playwright-cli cookie-list
electron-playwright-cli localstorage-list

# Modify values
electron-playwright-cli localstorage-set theme dark
electron-playwright-cli cookie-set debug true

# Reload to see effect
electron-playwright-cli reload
```

## Security Notes

- Never commit storage state files containing auth tokens
- Add `*.auth-state.json` to `.gitignore`
- Delete state files after automation completes
- Use environment variables for sensitive data
