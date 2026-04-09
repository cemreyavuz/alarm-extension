# Alarm extension

[![CI](https://github.com/cemreyavuz/alarm-extension/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/cemreyavuz/alarm-extension/actions/workflows/ci.yml)

Local time-based reminders as a Chrome **Manifest V3** extension. Built with **Bun**; output is loaded unpacked from `dist/`.

## Prerequisites

- [Bun](https://bun.sh/) on your `PATH`

## Setup

```bash
bun install
```

## Build

```bash
bun run build
```

In Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → choose the `dist/` directory.

## Tests

### Unit tests

```bash
bun test
```

Unit tests live under `src/` (see `bunfig.toml`). They do not start a browser.

### End-to-end (Playwright)

E2E tests load the **unpacked extension from `dist/`**, open the popup, and exercise the UI (add/delete alarms, presets, toggle). They do **not** rely on real alarm firing or notifications.

**1. Install Chromium and system libraries**

After `bun install`, install Playwright’s Chromium **and** the OS packages it needs. On **Linux and WSL**, `bunx playwright install chromium` alone is **not** enough: the browser binary still needs libraries such as **`libnspr4`**, or you will see errors like `error while loading shared libraries: libnspr4.so`.

Recommended (one command):

```bash
bun run playwright:install
```

That runs `bunx playwright install --with-deps chromium`, which installs Chromium and runs Playwright’s dependency installer. It usually prompts for **`sudo`** on Linux so packages can be installed via `apt`.

If you already installed the browser without deps, fix the libraries with:

```bash
sudo bunx playwright install-deps chromium
```

On **macOS** or **Windows**, `bunx playwright install chromium` is often sufficient (no separate `install-deps` step).

**2. Run E2E tests**

The extension runs in **headed** Chromium (extensions are not supported in headless mode). On **Linux/WSL without a real display**, use a virtual framebuffer:

```bash
xvfb-run -a bun run test:e2e
```

On macOS or Windows with a normal desktop:

```bash
bun run test:e2e
```

That script runs `bun run build` and then `bunx playwright test`.

**UI mode (watch tests in Playwright’s app)** — same config and `e2e/` specs as the CLI; you get a tree of tests, time travel, traces, and you can re-run a single test.

```bash
bun run test:e2e:ui
```

That is `bun run build` plus `bunx playwright test --ui`. You need a **working GUI** (local macOS/Windows, or WSL with WSLg / an X server). For **step-through debugging** in a browser window instead, use `bun run build && bunx playwright test --debug`.

#### Troubleshooting

| Symptom                                                                  | What to do                                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `libnspr4.so: cannot open shared object file` (or similar missing `.so`) | Run `bun run playwright:install` or `sudo bunx playwright install-deps chromium`, then retry. |
| Tests fail immediately with no browser window on SSH/WSL without GUI     | Use `xvfb-run -a bun run test:e2e` (install `xvfb` if needed: `sudo apt install xvfb`).       |

## CI

GitHub Actions runs unit tests, installs Playwright Chromium with `--with-deps`, installs `xvfb`, and runs `xvfb-run -a bun run test:e2e`. See `.github/workflows/ci.yml`.
