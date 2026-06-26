import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto('http://localhost:5175/sign-up', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'C:/Users/User/Desktop/medflow-frontend/patient-frontend/signup-1920x1080.png' });

await page.goto('http://localhost:5175/sign-in', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'C:/Users/User/Desktop/medflow-frontend/patient-frontend/signin-1920x1080.png' });

await browser.close();
console.log('done');
