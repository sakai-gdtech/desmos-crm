import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const out = 'docs/evidence/system-gold';
const baseURL = 'http://localhost:3017';
const browser = await chromium.launch({channel:'chrome',headless:true});
const checks=[];
try {
  for (const theme of ['light','dark']) {
    const context=await browser.newContext({baseURL, viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.addInitScript(t=>localStorage.setItem('orbit-theme',t),theme);
    const suffix=`${Date.now()}-${theme}`;
    const r=await context.request.post('/api/auth/register',{headers:{Origin:baseURL},data:{name:'Ana Visão',companyName:'Visão · ensaio fictício',email:`gold-vision-${suffix}@example.test`,password:`Desmos-Vision-${suffix}!`}});
    expect(r.status()).toBe(201);
    await page.goto('/workspace');
    await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
    const session=await context.newCDPSession(page);
    for (const type of ['protanopia','deuteranopia']) {
      await session.send('Emulation.setEmulatedVisionDeficiency',{type});
      await page.screenshot({path:`${out}/vision-${theme}-${type}.png`,fullPage:true});
      expect(await page.locator('.nav-active').getAttribute('aria-current')).toBe('page');
      await expect(page.locator('.nav-active')).toHaveText('Visão geral');
      checks.push({theme,type,currentRouteHasTextAndAria:true});
    }
    await session.send('Emulation.setEmulatedVisionDeficiency',{type:'none'});
    await context.close();
  }
  await writeFile(`${out}/vision-checks.json`,JSON.stringify({method:'Chrome DevTools Protocol Emulation.setEmulatedVisionDeficiency; simulated, not a user study.',checks},null,2));
} finally {await browser.close();}
