# Velocity

Velocity is a browser-first competitive movement FPS. The repository is currently at Milestone M0: WALK, which provides the technically correct base FPS controller and graybox Movement Lab for human gameplay evaluation.

## Prerequisites

- Node.js 24.x LTS
- npm (included with Node.js)
- A modern browser with WebGL 2 support

## Setup

Install all workspace dependencies from the repository root:

```text
npm install
```

Start the local-only client development server:

```text
npm run dev
```

Vite prints the client URL when it is ready. The server binds to `127.0.0.1` by default; remote exposure must be explicitly requested by the developer.

### Controls

- Click **Click to play** to enter Pointer Lock.
- Use **WASD** to move.
- Press **Space** to jump.
- Press **Escape** to release Pointer Lock.

## Validation

```text
npm run lint
npm run typecheck
npm run test
npm run format:check
npm run build
npm audit
```

Use `npm run format` to format supported active project files. Phase 0 source-of-truth documents under `docs/` are excluded from bulk formatting.

## Repository structure

```text
apps/
  client/       TypeScript, Vite, PlayCanvas, and M0 Movement Lab client
docs/           Project source-of-truth documents
.github/        Continuous integration workflow
```

Future server, backend, and shared workspaces remain documented architectural boundaries and will be created only when a concrete milestone needs them.
