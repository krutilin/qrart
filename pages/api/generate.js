import fetch from "node-fetch";
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { run } = require("qrart-lib");
const sharp = require("sharp");

const cdn_url = "https://qrart.fra1.cdn.digitaloceanspaces.com/templates/";
const GIPHY_BY_ID_URL = "https://api.giphy.com/v1/gifs/";
const GIPHY_RANDOM_URL = "https://api.giphy.com/v1/gifs/random";
const MAX_GIF_FRAMES = 24;
const GIF_FETCH_TIMEOUT_MS = 8000;

const images = [
  "cat",
  "dog",
  "frog",
  "lol",
  "troll",
  "mona-lisa",
  "yoda",
  "hippo",
  "cat1",
  "bird",
  "cat2",
  "cat3",
];

const QR_VERSION = 10;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempDir = null;

  try {
    const { data, index, file, giphyId, giphyUrl } = req.body;

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "qrart-site-"));
    let useGifOutput = false;
    let sourceImagePath = null;

    if (file) {
      const { buffer, mimeType } = parseDataUrl(file);
      useGifOutput = mimeType === "image/gif";
      sourceImagePath = path.join(tempDir, useGifOutput ? "source.gif" : "source.png");
      if (useGifOutput) {
        await writeSquareGif(buffer, sourceImagePath);
      } else {
        await fs.writeFile(sourceImagePath, buffer);
      }
    } else if (giphyId || giphyUrl) {
      useGifOutput = true;
      sourceImagePath = path.join(tempDir, "source.gif");
      await writeGiphySource({ giphyId, giphyUrl }, sourceImagePath);
    } else if (index != null) {
      sourceImagePath = path.join(tempDir, "source.png");
      await writeTemplateImage(index, sourceImagePath);
    } else {
      useGifOutput = true;
      sourceImagePath = path.join(tempDir, "source.gif");
      await writeRandomGiphy(sourceImagePath);
    }

    const { qrName } = await run(data, {
      version: QR_VERSION,
      picture: sourceImagePath,
      colorized: true,
      saveDir: tempDir,
      saveName: useGifOutput ? "qrcode.gif" : "qrcode.png",
    });

    if (useGifOutput) {
      const qr = await fs.readFile(qrName);
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(qr);
    }

    const qr = await sharp(qrName).toFormat("jpeg", { mozjpeg: true }).toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(qr);
  } catch (e) {
    console.log(e);
    res.status(e.statusCode || 500).json({
      error: e.publicMessage || "Internal server error!",
    });
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { force: true, recursive: true });
    }
  }
}

const parseDataUrl = (dataUrl) => {
  const [, , mimeType, base64] = dataUrl.match(/^(data:)?(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/) ?? [];
  if (!base64) {
    throw new Error("Invalid image payload");
  }
  return {
    buffer: Buffer.from(base64, "base64"),
    mimeType,
  };
};

const writeTemplateImage = async (index, outputPath) => {
  const imageIndex = Number.isInteger(index) && index >= 0 && index < images.length ? index : 0;
  const imgRes = await fetch(`${cdn_url}${images[imageIndex]}.png`);
  if (!imgRes.ok) {
    throw new Error("Failed to fetch template image");
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  await fs.writeFile(outputPath, buf);
};

const writeRemoteGiphy = async (imageUrl, outputPath, { normalize = true } = {}) => {
  let url;
  try {
    url = normalize ? normalizeGiphyImageUrl(imageUrl) : new URL(imageUrl);
  } catch (e) {
    throw new PublicApiError(400, "Invalid GIPHY image URL");
  }

  if (url.protocol !== "https:" || !isGiphyHost(url.hostname)) {
    throw new PublicApiError(400, "Invalid GIPHY image URL");
  }

  let imgRes;
  try {
    imgRes = await fetchWithTimeout(url.toString(), GIF_FETCH_TIMEOUT_MS);
  } catch (e) {
    throw new PublicApiError(422, "Could not load this GIF. Try another one.");
  }

  if (!imgRes.ok) {
    throw new PublicApiError(422, "Could not load this GIF. Try another one.");
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  try {
    await writeSquareGif(buf, outputPath);
  } catch (e) {
    throw new PublicApiError(422, "Could not process this GIF. Try a smaller one.");
  }
};

const isGiphyHost = (hostname) => hostname === "giphy.com" || hostname.endsWith(".giphy.com");

const writeGiphySource = async ({ giphyId, giphyUrl }, outputPath) => {
  const id = giphyId || extractGiphyId(giphyUrl);
  if (!id) {
    await writeRemoteGiphy(giphyUrl, outputPath);
    return;
  }

  const gif = await fetchGiphyById(id);
  await writeFirstWorkingGiphy(getGiphyImageCandidates(gif), outputPath);
};

const fetchGiphyById = async (id) => {
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    throw new PublicApiError(503, "GIF search is not configured.");
  }

  const url = new URL(id, GIPHY_BY_ID_URL);
  url.searchParams.set("api_key", apiKey);

  const giphyRes = await fetchWithTimeout(url.toString(), GIF_FETCH_TIMEOUT_MS);
  const json = await giphyRes.json();
  if (!giphyRes.ok || !json.data?.images) {
    throw new PublicApiError(422, "Could not load this GIF. Try another one.");
  }
  return json.data;
};

const getGiphyImageCandidates = (gif) => [
  gif.images?.fixed_width?.url,
  gif.images?.fixed_height?.url,
  gif.images?.downsized?.url,
  gif.images?.downsized_medium?.url,
  gif.images?.original?.url,
].filter(Boolean);

const writeFirstWorkingGiphy = async (imageUrls, outputPath) => {
  const errors = [];
  for (const imageUrl of imageUrls) {
    try {
      await writeRemoteGiphy(imageUrl, outputPath, { normalize: false });
      return;
    } catch (e) {
      errors.push(e.message);
    }
  }

  throw new PublicApiError(422, "Could not process this GIF. Try another one.");
};

const extractGiphyId = (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    if (!isGiphyHost(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const fileIndex = parts.findIndex((part) => part.endsWith(".gif"));
    return fileIndex > 0 ? parts[fileIndex - 1] : null;
  } catch (e) {
    return null;
  }
};

const normalizeGiphyImageUrl = (imageUrl) => {
  const url = new URL(imageUrl);
  if (isGiphyHost(url.hostname) && url.pathname.endsWith(".gif")) {
    const parts = url.pathname.split("/");
    parts[parts.length - 1] = "200w.gif";
    url.pathname = parts.join("/");
  }
  return url;
};

const writeRandomGiphy = async (outputPath) => {
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    throw new PublicApiError(503, "GIF search is not configured.");
  }

  try {
    const url = new URL(GIPHY_RANDOM_URL);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("tag", "pixel");
    url.searchParams.set("rating", "g");

    const giphyRes = await fetch(url.toString());
    const json = await giphyRes.json();
    if (!giphyRes.ok || !json.data?.images) {
      throw new PublicApiError(422, "Could not find a random GIF. Try again.");
    }

    await writeFirstWorkingGiphy(getGiphyImageCandidates(json.data), outputPath);
  } catch (e) {
    if (e.statusCode) {
      throw e;
    }
    throw new PublicApiError(422, "Could not generate a random GIF. Try again.");
  }
};

const writeSquareGif = async (buffer, outputPath) => {
  const metadata = await sharp(buffer, { animated: true }).metadata();
  const pages = Math.min(metadata.pages || 1, MAX_GIF_FRAMES);

  await sharp(buffer, { animated: true, pages })
    .resize(512, 512, { fit: "cover" })
    .gif()
    .toFile(outputPath);
};

const fetchWithTimeout = async (url, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

class PublicApiError extends Error {
  constructor(statusCode, publicMessage) {
    super(publicMessage);
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}
