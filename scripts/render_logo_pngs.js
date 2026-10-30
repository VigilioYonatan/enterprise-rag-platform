#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(
  path.resolve(
    __dirname,
    '../apps/enterprise-rag-web/node_modules/@playwright/test',
  ),
);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  const tasks = [
    {
      svg: 'docs/assets/logo-light.svg',
      png: 'docs/assets/logo-light.png',
      width: 512,
      height: 512,
    },
    {
      svg: 'docs/assets/logo-dark.svg',
      png: 'docs/assets/logo-dark.png',
      width: 512,
      height: 512,
    },
    {
      svg: 'docs/assets/logo-horizontal-light.svg',
      png: 'docs/assets/logo-horizontal-light.png',
      width: 1024,
      height: 320,
    },
    {
      svg: 'docs/assets/logo-horizontal-dark.svg',
      png: 'docs/assets/logo-horizontal-dark.png',
      width: 1024,
      height: 320,
    },
  ];

  for (const task of tasks) {
    const svgPath = path.resolve(__dirname, '..', task.svg);
    const pngPath = path.resolve(__dirname, '..', task.png);
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    await page.setViewportSize({ width: task.width, height: task.height });
    await page.setContent(
      `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;">${svgContent}</body></html>`,
    );

    const svgElement = await page.$('svg');
    if (svgElement) {
      await svgElement.screenshot({
        path: pngPath,
        omitBackground: true,
      });
      console.log(`Rendered: ${task.png} (${task.width}x${task.height})`);
    } else {
      console.error(`Failed to find SVG element in ${task.svg}`);
    }
  }

  await browser.close();
  console.log('All brand PNGs successfully rendered!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
