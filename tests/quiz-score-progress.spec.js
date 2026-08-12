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


test('quiz metric boxes show correct, incorrect and answered/total', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  expect(source).toContain('${stats.correct}</b><small>jó válasz');
  expect(source).toContain('${Math.max(0,stats.answered-stats.correct)}</b><small>hibás válasz');
  expect(source).toContain('${stats.answered}/${stats.total}</b><small>megválaszolt kérdés');
});
