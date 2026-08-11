import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/index.html');await page.waitForSelector('#view');});
test('home and main navigation render',async({page})=>{await expect(page.locator('#view')).toBeVisible();await expect(page.locator('body')).not.toHaveClass(/has-runtime-error/);});
test('all main modules open',async({page})=>{for(const label of ['QUIT & GO','QUICK WIN','WIN-WIN','GALAXY GUIDE']){const target=page.getByText(label,{exact:false}).first();if(await target.count()){await target.click();await expect(page.locator('#view')).toContainText(label.split(' ')[0],{ignoreCase:true});}}});
test('interactive controls remain clickable',async({page})=>{const flip=page.locator('[data-flip-card]').first();if(await flip.count()){await flip.click();await expect(flip).toHaveAttribute('aria-pressed','true')}const details=page.locator('details').first();if(await details.count()){await details.locator('summary').click();await expect(details).toHaveAttribute('open','')}const quiz=page.locator('[data-quiz]').first();if(await quiz.count()){await quiz.click();await expect(page.locator('.quiz-feedback')).toBeVisible()}});
test('no horizontal overflow',async({page})=>{const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);expect(overflow).toBeFalsy()});

test('BETA 1.0 local state migrates without clearing storage',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('utiterv-beta-100',JSON.stringify({route:'onmagam',lastRoute:'onmagam',sections:{onmagam:'mindfulness'},indices:{groundingStep:3},viewed:{},checklist:[],mindfulness:{}})));
  await page.goto('/index.html');
  await page.waitForSelector('#view');
  await expect(page.locator('body')).not.toHaveClass(/has-runtime-error/);
  await expect(page.locator('#view')).toContainText('Mindfulness');
  const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('utiterv-beta-110')||'null'));
  expect(migrated?.sections?.onmagam).toBe('mindfulness');
});

test('new BETA 1.1 content sections are reachable',async({page})=>{
  await page.goto('/index.html');
  await page.evaluate(()=>localStorage.setItem('utiterv-beta-110',JSON.stringify({schema:2,route:'helyzeteim',lastRoute:'helyzeteim',sections:{helyzeteim:'jobhunt'},indices:{},viewed:{},quizAnswers:{},checklist:[],mindfulness:{}})));
  await page.reload();
  await page.waitForSelector('#view');
  await expect(page.locator('#view')).toContainText('Állásvadászat Z módra');
});
