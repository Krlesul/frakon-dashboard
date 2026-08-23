# FRAKON Studio Web

Standalone visual dashboard editor for FRAKON Dashboard.

## Development

```bash
npm install
npm run studio:dev
```

## Production build

```bash
npm run studio:build
```

The build produces:

- `dist/studio/index.html` plus its optimized asset bundle
- `dist/studio/FRAKON-Studio.html`, a self-contained single-file build intended for quick desktop testing

FRAKON Studio can work offline with local browser autosave and JSON import/export. When connected to Home Assistant it can browse live entities and load/publish FRAKON v1 dashboard documents through the installed FRAKON Dashboard integration.

### Home Assistant authentication

The first standalone web build uses a Home Assistant long-lived access token. The token is kept only in JavaScript memory for the lifetime of the open Studio page. It is never written to `localStorage` by FRAKON Studio. The Home Assistant base URL may be remembered locally for convenience.

Do not paste Home Assistant access tokens into issues, chat messages, screenshots, source control, or exported dashboard files.
