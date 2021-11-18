// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
const qrcode = require("qrcode-generator");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

const cdn_url =
  "https://cdn-img.fra1.cdn.digitaloceanspaces.com/qrart-app/png/";

const images = ["cat", "dog", "frog", "lol", "troll"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(500).json({ error: "Method not allowed" });
  }

  const { data } = req.body;

  const imgSize = 512;

  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext("2d");

  const QR = qrcode(6, "M");
  QR.addData(data);
  QR.make();

  const rndImageIndex = Math.floor(Math.random() * images.length);
  const rndImageUrl = `${cdn_url}${images[rndImageIndex]}.png`;

  const image = await loadImage(rndImageUrl);
  ctx.drawImage(image, 0, 0);

  let pixelSize = 1;
  let blockSize = Math.floor((pixelSize * imgSize) / QR.getModuleCount()); // 3 * pixelSize;

  var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var d = pixels.data;
  var width = Math.sqrt(d.length / 4) / pixelSize;
  for (var i = 0; i < d.length; i += 4) {
    var r = d[i];
    var g = d[i + 1];
    var b = d[i + 2];
    var grey = r * 0.2126 + g * 0.7152 + b * 0.0722;
    //var v = (grey >= 127) ? 255 : 0;
    //d[i] = d[i+1] = d[i+2] = v;
    d[i] = d[i + 1] = d[i + 2] = grey;
  }

  for (var i = 0; i < d.length; i += 4) {
    var grey = d[i];
    var v = grey >= 127 ? 255 : 0;

    // Dithering
    var error = (grey - v) / 8;
    var i2 = i / 4;
    var row = Math.floor(i2 / width);
    var cell = i2 % width;

    d[i] = d[i + 1] = d[i + 2] = v;

    d[((row + 0) * width + (cell + 1)) * 4] =
      d[((row + 0) * width + (cell + 1)) * 4 + 1] =
      d[((row + 0) * width + (cell + 1)) * 4 + 2] =
        d[((row + 0) * width + (cell + 1)) * 4] + error;
    d[((row + 0) * width + (cell + 2)) * 4] =
      d[((row + 0) * width + (cell + 2)) * 4 + 1] =
      d[((row + 0) * width + (cell + 2)) * 4 + 2] =
        d[((row + 0) * width + (cell + 2)) * 4] + error;
    d[((row + 1) * width + (cell - 1)) * 4] =
      d[((row + 1) * width + (cell - 1)) * 4 + 1] =
      d[((row + 1) * width + (cell - 1)) * 4 + 2] =
        d[((row + 1) * width + (cell - 1)) * 4] + error;
    d[((row + 1) * width + (cell + 0)) * 4] =
      d[((row + 1) * width + (cell + 0)) * 4 + 1] =
      d[((row + 1) * width + (cell + 0)) * 4 + 2] =
        d[((row + 1) * width + (cell + 0)) * 4] + error;
    d[((row + 1) * width + (cell + 1)) * 4] =
      d[((row + 1) * width + (cell + 1)) * 4 + 1] =
      d[((row + 1) * width + (cell + 1)) * 4 + 2] =
        d[((row + 1) * width + (cell + 1)) * 4] + error;
    d[((row + 2) * width + (cell + 0)) * 4] =
      d[((row + 2) * width + (cell + 0)) * 4 + 1] =
      d[((row + 2) * width + (cell + 0)) * 4 + 2] =
        d[((row + 2) * width + (cell + 0)) * 4] + error;
  }
  ctx.putImageData(pixels, 0, 0);

  console.log("module count", QR.getModuleCount());

  console.log(blockSize);

  const cornerSize = 7;

  const isCorner = (row, col, count) => {
    return (
      (row < 7 && col < 7) ||
      (row < 7 && col >= count - 7) ||
      (col < 7 && row >= count - 7) ||
      col === 6 ||
      row === 6
    );
  };

  for (let byteRow = 0; byteRow < QR.getModuleCount(); byteRow++) {
    for (let byteCell = 0; byteCell < QR.getModuleCount(); byteCell++) {
      // TODO
      const moduleSize = isCorner(byteRow, byteCell, QR.getModuleCount())
        ? blockSize
        : Math.floor(blockSize / 1.7);

      // Middle Cell
      ctx.fillStyle = QR.isDark(byteRow, byteCell) ? "black" : "white";
      ctx.fillRect(
        byteRow * blockSize + pixelSize,
        byteCell * blockSize + pixelSize,
        moduleSize,
        moduleSize
      );
    }
  }

  res.status(200).json({ url: canvas.toDataURL() });
}
