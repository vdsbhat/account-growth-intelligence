// No browser dependency: exercise the real client filtering/export logic with
// a minimal document stub, then inspect the resulting Blob as CSV text.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const elements = new Map();
let capturedBlob;
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value: '', checked: false, disabled: false, innerHTML: '', textContent: '',
    append() {}, addEventListener() {}, setAttribute() {}, removeAttribute() {}, click() {}, focus() {}, querySelector() { return null; }
  });
  return elements.get(id);
}
const context = vm.createContext({
  window: {}, document: {getElementById: element, createElement: () => element('link'), addEventListener() {}},
  Blob, URL: {createObjectURL(blob) {capturedBlob = blob; return 'blob:test';}, revokeObjectURL() {}},
  setTimeout(fn) {fn();}
});
vm.runInContext(fs.readFileSync(path.join(root, 'data/dashboard-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8'), context);
async function exported() {
  vm.runInContext('download()', context);
  return (await capturedBlob.text()).replace(/^\uFEFF/, '').split('\r\n');
}
(async () => {
  const candidates = context.window.DEMO_DATA.candidates;
  const covered = candidates.filter(row => row.evidence_complete);
  assert.match(element('count').textContent, new RegExp(`^${covered.length} eligible`));
  let lines = await exported();
  assert.equal(lines.length, 51, 'Header plus 50 targets');
  assert(lines.slice(1).every(line => line.includes(',"true",')), 'Every exported row has complete coverage');
  element('product').value = 'Marketing Automation';
  element('region').value = 'APAC';
  vm.runInContext('render()', context);
  const mapApac = covered.filter(row => row.product_id === 'MAP' && row.region === 'APAC');
  assert.match(element('count').textContent, new RegExp(`^${mapApac.length} eligible`));
  lines = await exported();
  assert.equal(lines.length, Math.min(50, mapApac.length) + 1);
  assert(lines.slice(1).every(line => line.includes('"APAC"') && line.includes('"MAP"')));
  element('incomplete').checked = true;
  element('product').value = '';
  element('region').value = '';
  const missingAccount = candidates.find(row => !row.evidence_complete).account_id;
  element('search').value = missingAccount;
  vm.runInContext('render()', context);
  assert.match(element('count').textContent, new RegExp(`^${candidates.filter(row => row.account_id === missingAccount).length} eligible`));
  assert.equal(element('export').disabled, true);
  assert.equal((await exported()).length, 1, 'Even direct export excludes gaps');
  element('search').value = 'no-such-account';
  vm.runInContext('render()', context);
  assert.equal(element('export').disabled, true);
  assert.match(element('rows').innerHTML, /No matching accounts/);

  // Score boundaries: each integer belongs to exactly one band, including 100.
  for (const [score, band] of [[0,'0-39'],[39,'0-39'],[40,'40-59'],[59,'40-59'],[60,'60-79'],[79,'60-79'],[80,'80-100'],[100,'80-100']]) {
    assert.equal(vm.runInContext(`matchesScore(${score}, '${band}')`, context), true);
    assert.equal(vm.runInContext(`scoreRanges.filter(r => matchesScore(${score}, r.value)).length`, context), 1);
  }
  vm.runInContext('resetFilters()', context);
  element('industry').value = 'Retail';
  vm.runInContext("selectedScoreRanges.add('60-79')", context);
  vm.runInContext('render()', context);
  const expected = context.window.DEMO_DATA.candidates.filter(r => r.evidence_complete && r.industry === 'Retail' && r.score >= 60 && r.score <= 79);
  assert.match(element('count').textContent, new RegExp(`^${expected.length} eligible`));
  lines = await exported();
  assert.equal(lines.length, Math.min(50, expected.length) + 1);
  for (const line of lines.slice(1)) {
    const cells = line.slice(1, -1).split('","');
    assert.equal(cells[3], 'Retail');
    assert(Number(cells[6]) >= 60 && Number(cells[6]) <= 79);
  }
  for (const grouping of ['industries', 'scores']) {
    assert.equal(vm.runInContext(`distributionGroups(filtered).${grouping}.reduce((sum, g) => sum + g.count, 0)`, context), expected.length);
  }
  assert.match(element('score-chart').innerHTML, /aria-pressed="true"/);
  vm.runInContext("applyChartFilter('score-range', '60-79')", context);
  assert.equal(vm.runInContext('selectedScoreRanges.size', context), 0, 'Click selected score band to clear');
  assert.equal(element('industry').value, 'Retail', 'Keep other filters');
  vm.runInContext("applyChartFilter('score-range', '80-100')", context);
  assert.equal(vm.runInContext("selectedScoreRanges.has('80-100')", context), true);
  assert.equal(vm.runInContext('page', context), 0);
  vm.runInContext("applyChartFilter('score-range', '0-39')", context);
  const multiExpected = context.window.DEMO_DATA.candidates.filter(r => r.evidence_complete && r.industry === 'Retail' && (r.score >= 80 || r.score <= 39));
  assert.match(element('count').textContent, new RegExp(`^${multiExpected.length} eligible`));
  assert.equal(vm.runInContext('selectedScoreRanges.size', context), 2);
  lines = await exported();
  for (const line of lines.slice(1)) {
    const cells = line.slice(1, -1).split('","');
    assert(Number(cells[6]) >= 80 || Number(cells[6]) <= 39, 'Non-adjacent ranges form a union');
  }
  assert.equal((element('score-chart').innerHTML.match(/aria-pressed="true"/g) || []).length, 2);
  const expectedAccounts = [...new Set(multiExpected.map(r => r.account_id))];
  assert.equal((element('account-options').innerHTML.match(/role="option"/g) || []).length, expectedAccounts.length, 'Account choices are unique and follow all other filters');
  expectedAccounts.forEach(id => assert(element('account-options').innerHTML.includes(id)));
  element('search').value = multiExpected[0].name;
  vm.runInContext('render()', context);
  assert.equal((element('account-options').innerHTML.match(/role="option"/g) || []).length, expectedAccounts.length, 'Selected account keeps alternative choices');
  vm.runInContext(`chooseAccount('${multiExpected[0].account_id}')`, context);
  assert.equal(element('search').value, multiExpected[0].name);
  assert.equal(element('account-options').hidden, true);
  element('region').value = multiExpected[0].region === 'APAC' ? 'EMEA' : 'APAC';
  vm.runInContext('reconcileAccountSelection(); render()', context);
  assert.equal(element('search').value, '', 'A selected account excluded by new filters is cleared');
  vm.runInContext('resetFilters()', context);
  assert.match(element('count').textContent, new RegExp(`^${covered.length} eligible`));
  element('search').value = 'no-such-account';
  vm.runInContext('render()', context);
  assert(!element('score-chart').innerHTML.includes('NaN'));
  assert.match(element('distribution-summary').textContent, /No matching/);
  console.log('PASS: shortlist/export limits, score multi-selection, chart totals/toggling, dependent account choices, reset and empty states.');
})().catch(error => {console.error(error); process.exitCode = 1;});
