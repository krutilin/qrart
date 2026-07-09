import fetch from "node-fetch";
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { run } = require("qrart-lib");
const sharp = require("sharp");

const cdn_url = "https://qrart.fra1.cdn.digitaloceanspaces.com/templates/";
const GIPHY_RANDOM_URL = "https://api.giphy.com/v1/gifs/random";
const MAX_GIF_FRAMES = 18;
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
  maxDuration: 30,
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
    const { data, index, file, giphyUrl } = req.body;

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
    } else if (giphyUrl) {
      useGifOutput = true;
      sourceImagePath = path.join(tempDir, "source.gif");
      try {
        await writeRemoteGiphy(giphyUrl, sourceImagePath);
      } catch (e) {
        console.log(e);
        useGifOutput = false;
        sourceImagePath = path.join(tempDir, "source.png");
        await writeTemplateImage(Math.floor(Math.random() * images.length), sourceImagePath);
      }
    } else if (index != null) {
      sourceImagePath = path.join(tempDir, "source.png");
      await writeTemplateImage(index, sourceImagePath);
    } else {
      useGifOutput = await writeRandomGiphy(path.join(tempDir, "source.gif"));
      sourceImagePath = path.join(tempDir, useGifOutput ? "source.gif" : "source.png");
      if (!useGifOutput) {
        await writeTemplateImage(Math.floor(Math.random() * images.length), sourceImagePath);
      }
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
    res.status(500).json({ error: "Internal server error!" });
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

const writeRemoteGiphy = async (imageUrl, outputPath) => {
  const url = normalizeGiphyImageUrl(imageUrl);
  if (url.protocol !== "https:" || !isGiphyHost(url.hostname)) {
    throw new Error("Invalid GIPHY image URL");
  }

  const imgRes = await fetchWithTimeout(url.toString(), GIF_FETCH_TIMEOUT_MS);
  if (!imgRes.ok) {
    throw new Error("Failed to fetch GIPHY image");
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  await writeSquareGif(buf, outputPath);
};

const isGiphyHost = (hostname) => hostname === "giphy.com" || hostname.endsWith(".giphy.com");

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
    return false;
  }

  try {
    const url = new URL(GIPHY_RANDOM_URL);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("tag", "pixel");
    url.searchParams.set("rating", "g");

    const giphyRes = await fetch(url.toString());
    const json = await giphyRes.json();
    const imageUrl =
      json.data?.images?.fixed_width?.url ||
      json.data?.images?.downsized?.url ||
      json.data?.images?.original?.url;
    if (!giphyRes.ok || !imageUrl) {
      return false;
    }

    await writeRemoteGiphy(imageUrl, outputPath);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const writeSquareGif = async (buffer, outputPath) => {
  await sharp(buffer, { animated: true, pages: MAX_GIF_FRAMES })
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
