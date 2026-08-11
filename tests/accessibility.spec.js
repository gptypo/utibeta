import {test,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';
test('home has no serious accessibility violations',async({page})=>{await page.goto('/index.html');await page.waitForSelector('#view');const results=await new AxeBuilder({page}).analyze();expect(results.violations.filter(v=>['critical','serious'].includes(v.impact))).toEqual([])});
