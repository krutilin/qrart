import fetch from "node-fetch";
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const aws = require("aws-sdk");
const { nanoid } = require("nanoid");
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

const fileExtension = "jpeg";
const ENDPOINT = "fra1.digitaloceanspaces.com";
const BUCKET = "qrart";
const LOCAL_OUTPUT_DIR = process.env.QRART_LOCAL_OUTPUT_DIR;
const QR_VERSION = 10;

const spacesEndpoint = new aws.Endpoint(ENDPOINT);
const s3 = new aws.S3({
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
  },
  region: "us-east-2",
  endpoint: spacesEndpoint,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempDir = null;

  try {
    const { data, index, file } = req.body;

    const rndImageIndex =
      index != null ? index : Math.floor(Math.random() * images.length);
    const rndImageUrl = `${cdn_url}${images[rndImageIndex]}.png`;

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "qrart-site-"));
    const sourceImagePath = path.join(tempDir, "source.png");

    if (file) {
      await writeDataUrl(file, sourceImagePath);
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
      saveName: "qrcode.png",
    });

    const qr = await sharp(qrName)
      .toFormat("jpeg", { mozjpeg: true })
      .toBuffer();

    const key = `res/${nanoid(10)}/qrcode.${fileExtension}`;

    const url = await publishQr(key, qr);

    res.status(200).json({ url });
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

const publishQr = async (key, qr) => {
  if (LOCAL_OUTPUT_DIR) {
    const outputPath = path.join(process.cwd(), LOCAL_OUTPUT_DIR, key);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, qr);
    return `/${key}`;
  }

  await s3
    .putObject({
      Body: qr,
      Bucket: BUCKET,
      Key: key,
      ACL: "public-read",
    })
    .promise();

  return `https://${BUCKET}.${ENDPOINT}/${key}`;
};
