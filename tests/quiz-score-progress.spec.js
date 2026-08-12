const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('quiz progress is based on correct answers, not merely answered questions', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  expect(source).toContain('percent:total?Math.round(correct/total*100):0');
  expect(source).toContain('${st.correct}/${st.total}');
  expect(source).toContain('Math.round(totals.correct/totals.total*100)');
  expect(source).toContain('Math.round(total.correct/total.total*100)');
  expect(source).toContain('${total.correct}/${total.total} helyes');
});
