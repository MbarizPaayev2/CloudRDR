import path from 'node:path';
import { chromium } from 'playwright';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOT_DIR = path.resolve('report/screenshots');

async function fixScreenshots() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  await page.goto('https://midproject-beta.vercel.app/demo/index.html', { waitUntil: 'networkidle' });

  // 1. Capture Detection Chart Card
  console.log('Capturing detection chart card...');
  await page.waitForTimeout(1000);
  const chartCard = await page.$('section:has(#detectionChartCanvas)');
  if (chartCard) {
    await chartCard.screenshot({ path: path.join(SCREENSHOT_DIR, '05_detection_sliding_window_graph.png') });
  }

  // 2. Trigger Burst to make Merkle tree corrupted
  console.log('Triggering Burst Attack on Merkle tree...');
  const burstBtn = await page.$('#btnDrillBurst');
  if (burstBtn) {
    await burstBtn.click();
    await page.waitForTimeout(800);
  }

  const merkleCard = await page.$('#merkleTreeContainer');
  if (merkleCard) {
    const parent = await merkleCard.evaluateHandle(el => el.closest('.demo-card') || el);
    await parent.screenshot({ path: path.join(SCREENSHOT_DIR, '07_merkle_tree_corruption_climb.png') });
  }

  // 3. Freeze & Capture Proof Chain Card
  console.log('Triggering Freeze to show Ed25519 signature proof...');
  const freezeBtn = await page.$('#btnDrillFreeze');
  if (freezeBtn) {
    await freezeBtn.click();
    await page.waitForTimeout(600);
  }

  const proofCard = await page.$('#proofChainCard');
  if (proofCard) {
    await proofCard.screenshot({ path: path.join(SCREENSHOT_DIR, '09_incident_detail_ed25519_valid.png') });
  }

  await browser.close();
  console.log('Refined components captured successfully!');
}

fixScreenshots().catch(console.error);
