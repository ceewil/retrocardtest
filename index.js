async function composeGrendalCard(baseImgUrl, name, outputFile = "final-card.png") {
  const response = await fetch(baseImgUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  // Resize the image BEFORE compositing to avoid dimension mismatch errors
  const resizedBuffer = await sharp(buffer)
    .resize(670, 670, { fit: 'cover' })
    .toBuffer();

  const canvasWidth = 768;
  const canvasHeight = 1343;

  // Location and size for character image
  const imageX = 49;
  const imageY = 334;

  const svgText = `
    <svg width="${canvasWidth}" height="${canvasHeight}">
      <style>
        .title {
          font-family: 'Impact', sans-serif;
          font-size: 48px;
          font-weight: bold;
          fill: #ff0000;
          stroke: #000000;
          stroke-width: 2px;
          paint-order: stroke;
        }
      </style>
      <text x="50%" y="1275" text-anchor="middle" class="title">${name}</text>
    </svg>
  `;

  const final = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: resizedBuffer, top: imageY, left: imageX },
      { input: "Grendalstt.png", top: 0, left: 0 },
      { input: Buffer.from(svgText), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();

  const outputPath = path.join(__dirname, "cards", outputFile);
  fs.writeFileSync(outputPath, final);
  return `/cards/${outputFile}`;
}
