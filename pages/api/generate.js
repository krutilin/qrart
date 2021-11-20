// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
const qrcode = require("qrcode-generator");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

const cdn_url =
  "https://cdn-img.fra1.cdn.digitaloceanspaces.com/qrart-app/png/";

const images = ["cat", "dog", "frog", "lol", "troll", "mona-lisa", "yoda"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(500).json({ error: "Method not allowed" });
  }

  const { data, index } = req.body;

  const imgSize = 512;

  const QR = qrcode(6, "M");
  QR.addData(data);
  QR.make();

  const rndImageIndex =
    index != null ? index : Math.floor(Math.random() * images.length);

  const rndImageUrl = `${cdn_url}${images[rndImageIndex]}.png`;

  let pixelSize = 1;
  let blockSize = Math.floor((pixelSize * imgSize) / QR.getModuleCount()); // 3 * pixelSize;

  const canvasSize = blockSize * QR.getModuleCount();

  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext("2d");

  const image = await loadImage(rndImageUrl);
  ctx.drawImage(image, 0, 0);

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

  const cornerSize = 7;

  const isCorner = (row, col, count) => {
    /*var pos =
      2 [6, 18],
      3 [6, 22],
      4 [6, 26],
      5 [6, 30],
      6 [6, 34],
      */

    // adjustPattern
    let pos = [6, 34];

    return (
      (row < 7 && col < 7) ||
      (row < 7 && col >= count - 7) ||
      (col < 7 && row >= count - 7) ||
      col === 6 ||
      row === 6 ||
      (col < 34 + 3 && col > 34 - 3 && row < 34 + 3 && row > 34 - 3)
    );
  };

  for (let byteRow = 0; byteRow < QR.getModuleCount(); byteRow++) {
    for (let byteCell = 0; byteCell < QR.getModuleCount(); byteCell++) {
      // Middle Cell
      ctx.fillStyle = ctx.strokeStyle = QR.isDark(byteRow, byteCell)
        ? "black"
        : "white";

      if (isCorner(byteRow, byteCell, QR.getModuleCount())) {
        ctx.fillRect(
          byteRow * blockSize + pixelSize,
          byteCell * blockSize + pixelSize,
          blockSize,
          blockSize
        );
      } else {
        ctx.beginPath();
        ctx.arc(
          byteRow * blockSize + blockSize / 2,
          byteCell * blockSize + blockSize / 2,
          Math.round(blockSize / 6),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  res.status(200).json({ url: canvas.toDataURL() });
}
