# Contributing

Thanks for considering a contribution to QR Art.

## Development

```sh
npm install
cp .env.example .env
npm run dev
```

Before opening a pull request, run:

```sh
npm run build
npm run lint
```

## Pull Requests

- Keep changes focused.
- Include screenshots or short recordings for UI changes.
- Do not commit `.env`, `.next/`, local logs, generated output, or API keys.
- For GIF generation changes, test at least one GIPHY result and one uploaded GIF.

## Code Style

Follow the existing code style. The project currently uses Next.js 12, React 17, and CommonJS-compatible server code in API routes.
