import * as fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import * as sharp from 'sharp';
import { Create, OverlayOptions, Sharp } from 'sharp';
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

const initPath = join(__dirname, '../assets/');

async function main() {
  try {
    const imagePaths: string[] = [];
    await getAllFiles(imagePaths, initPath);
    const images = imagePaths.map((o) => sharp(o));
    await joinImage(images);
  } catch (e) {
    console.error('has error:', e.message);
  }
}

main();

async function getAllFiles(imagePaths: string[], path: string) {
  const files = (await readdirAsync(path)).filter((o) => !o.startsWith('.'));
  for (const file of files) {
    const filePath = join(path, file);
    const stat = await statAsync(filePath);
    if (!stat.isDirectory()) {
      imagePaths.push(filePath);
    } else {
      await getAllFiles(imagePaths, filePath);
    }
  }
}
/**
 * 拼接图片
 * @param  { Array<string> } imagePaths
 * @param  { Array<Sharp> } imgList
 **/
async function joinImage(imgList: Array<Sharp>) {
  let totalWidth = 0;
  let totalHeight = 0;

  const maxRow = 13;
  const overlayList: OverlayOptions[] = [];

  // 获取所有图片的宽和高，计算和及最大值
  for (const [i, img] of imgList.entries()) {
    const { width, height } = await img.metadata();
    const rowNum = Math.ceil((i + 1) / maxRow);
    if (width && height) {
      const overlayOptions: OverlayOptions = {};

      overlayOptions.top = (i % maxRow) * height;
      overlayOptions.left = (rowNum - 1) * width + (rowNum - 1) * 10;
      overlayOptions.input = await img.resize(width, height).toBuffer();

      if (rowNum === 1) {
        totalHeight += height;
      }
      totalWidth = rowNum * width + (rowNum - 1) * 10;
      overlayList.push(overlayOptions);
    }
  }

  const baseOpt: Create = {
    width: totalWidth,
    height: totalHeight,
    channels: 4,
    background: {
      r: 255,
      g: 255,
      b: 255,
      alpha: 1,
    },
  };
  const rootDir = './dist';

  if (fs.existsSync(rootDir)) {
    fs.rmdirSync(rootDir, { recursive: true });
  }
  fs.mkdirSync(rootDir);
  await sharp({ create: baseOpt })
    .composite(overlayList)
    .toFile('dist/output.png');
}
