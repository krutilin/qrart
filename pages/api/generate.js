import fetch from "node-fetch";
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { run } = require("qrart-lib");
const sharp = require("sharp");

const cdn_url = "https://qrart.fra1.cdn.digitaloceanspaces.com/templates/";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempDir = null;

  try {
    const { data, index, file, giphyUrl } = req.body;

    const rndImageIndex =
      index != null ? index : Math.floor(Math.random() * images.length);
    const rndImageUrl = `${cdn_url}${images[rndImageIndex]}.png`;

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "qrart-site-"));
    const useGifOutput = Boolean(giphyUrl);
    const sourceImagePath = path.join(tempDir, useGifOutput ? "source.gif" : "source.png");

    if (file) {
      await writeDataUrl(file, sourceImagePath);
    } else if (giphyUrl) {
      await writeRemoteGiphy(giphyUrl, sourceImagePath);
    } else {
      const imgRes = await fetch(rndImageUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      await fs.writeFile(sourceImagePath, buf);
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
      return res.status(200).json({ url: toDataUrl(qr, "image/gif") });
    }

    const qr = await sharp(qrName).toFormat("jpeg", { mozjpeg: true }).toBuffer();

    res.status(200).json({ url: toDataUrl(qr, "image/jpeg") });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Internal server error!" });
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { force: true, recursive: true });
    }
  }
}

const writeDataUrl = async (dataUrl, outputPath) => {
  const [, base64] = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/) ?? [];
  if (!base64) {
    throw new Error("Invalid image payload");
  }
  await fs.writeFile(outputPath, Buffer.from(base64, "base64"));
};

const writeRemoteGiphy = async (imageUrl, outputPath) => {
  const url = new URL(imageUrl);
  if (url.protocol !== "https:" || !isGiphyHost(url.hostname)) {
    throw new Error("Invalid GIPHY image URL");
  }

  const imgRes = await fetch(url.toString());
  if (!imgRes.ok) {
    throw new Error("Failed to fetch GIPHY image");
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  await fs.writeFile(outputPath, buf);
};

const isGiphyHost = (hostname) => hostname === "giphy.com" || hostname.endsWith(".giphy.com");

const toDataUrl = (buffer, mimeType) => `data:${mimeType};base64,${buffer.toString("base64")}`;
