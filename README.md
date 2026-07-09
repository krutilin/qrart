# QR Art

QR Art is a small Next.js app for generating artistic QR codes:

- animated QR GIFs from GIPHY backgrounds;
- QR art from built-in templates;
- QR art from uploaded PNG, JPG, or GIF files;
- downloadable GIF or JPG output.

The app uses [`qrart-lib`](https://github.com/krutilin/qrart-lib) for QR-art generation.

## Demo

Production app: https://qrart.app/

## Requirements

- Node.js 24.x
- npm
- A GIPHY API key for GIF search and random GIF generation

## Local Setup

```sh
npm install
cp .env.example .env
npm run dev
```

Then open http://localhost:3000/.

Set your GIPHY key in `.env`:

```sh
NEXT_PUBLIC_GIPHY_API_KEY=your_giphy_api_key
```

## Scripts

```sh
npm run dev
npm run build
npm run start
npm run lint
```

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_GIPHY_API_KEY` | Yes for GIF search/random | GIPHY API key used by the browser search UI and server-side random GIF lookup. |

## Deployment

The project is deployed on Vercel. `vercel.json` configures a longer duration for `pages/api/generate.js`, because animated GIF generation can take longer than a default serverless function timeout.

## GIPHY Attribution

GIF search and random GIFs are powered by [GIPHY](https://giphy.com/). The official "Powered by GIPHY" attribution mark is included in `public/giphy/`.

## Repository Notes

- `png/` contains built-in template source assets used by the app.
- `.env` and other local environment files are intentionally ignored.
- Generated Next.js output (`.next/`) is intentionally ignored.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).

## License

MIT. See [LICENSE.md](./LICENSE.md).
