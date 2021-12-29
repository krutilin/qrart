import fetch from "node-fetch";
const aws = require("aws-sdk");
const { nanoid } = require("nanoid");
const sharp = require("sharp");
const { Buffer } = require("buffer");

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
    return res.status(500).json({ error: "Method not allowed" });
  }

  try {
    const { data, index, file } = req.body;

    const rndImageIndex =
      index != null ? index : Math.floor(Math.random() * images.length);
    const rndImageUrl = `${cdn_url}${images[rndImageIndex]}.png`;

    let sourceImage = null;

    if (file) {
      sourceImage = file;
    } else {
      const imgRes = await fetch(rndImageUrl);
      const buf = await imgRes.buffer();
      sourceImage = `data:image/png;base64,${buf.toString("base64")}`;
    }

    const lambda = new aws.Lambda({
      credentials: {
        accessKeyId: process.env.LAMBDA_ACCESS_KEY_ID,
        secretAccessKey: process.env.LAMBDA_SECRET_ACCESS_KEY,
      },
      region: "us-east-1",
    });

    const lambdaParams = {
      FunctionName: "amzqr4lambda",
      Payload: JSON.stringify({ word: data, image: sourceImage }),
    };

    const { Payload } = await lambda.invoke(lambdaParams).promise();
    const { body } = JSON.parse(Payload);

    if (body == null) {
      return res.status(500).json({ error: "Internal server error" });
    }

    const buffer = Buffer.from(
      body.replace("data:image/gif;base64,", ""),
      "base64"
    );

    const qr = await sharp(buffer)
      .toFormat("jpeg", { mozjpeg: true })
      .toBuffer();

    const key = `res/${nanoid(10)}/qrcode.${fileExtension}`;

    const params = {
      Body: qr,
      Bucket: BUCKET,
      Key: key,
      ACL: "public-read",
    };

    await s3.putObject(params).promise();
    const url = `https://${BUCKET}.${ENDPOINT}/${key}`;

    res.status(200).json({ url });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Internal server error!" });
  }
}
