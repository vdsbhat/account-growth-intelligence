"use strict";
const data = window.DEMO_DATA;
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let page = 0;
let selected = null;
let filtered = [];
const pageSize = 10;
const key = row => `${row.account_id}:${row.product_id}`;
const selectedScoreRanges = new Set();
let accountDropdownOpen = false;
let accountSuggestionIndex = -1;
let accountSuggestions = [];
const scoreRanges = [
  {value: "0-39", label: "0–39 points", min: 0, max: 39},
  {value: "40-59", label: "40–59 points", min: 40, max: 59},
  {value: "60-79", label: "60–79 points", min: 60, max: 79},
  {value: "80-100", label: "80–100 points", min: 80, max: 100}
];

function matchesScore(score, rangeValue) {
  const range = scoreRanges.find(item => item.value === rangeValue);
  return !range || (score >= range.min && score <= range.max);
}

function matchesSelectedScores(score) {
  return !selectedScoreRanges.size || [...selectedScoreRanges].some(value => matchesScore(score, value));
}

function candidatesForFilters() {
  return data.candidates.filter(row =>
    (!$("product").value || row.product_name === $("product").value) &&
    (!$("region").value || row.region === $("region").value) &&
    (!$("industry").value || row.industry === $("industry").value) &&
    matchesSelectedScores(row.score) && ($("incomplete").checked || row.evidence_complete));
}

function accountChoices(rows) {
  return [...new Map(rows.map(row => [row.account_id, row])).values()].sort((a, b) => a.name.localeCompare(b.name));
}

function syncFilterControls() {
  const choices = accountChoices(candidatesForFilters());
  const query = $("search").value.trim().toLowerCase();
  const exact = choices.some(row => row.name.toLowerCase() === query || row.account_id.toLowerCase() === query);
  accountSuggestions = choices.filter(row => !query || exact || `${row.name} ${row.account_id}`.toLowerCase().includes(query));
  renderAccountMenu();
  $("search").placeholder = choices.length ? `Choose from ${choices.length} accounts` : "No accounts match these filters";
  const chosen = scoreRanges.filter(range => selectedScoreRanges.has(range.value));
  $("score-summary").textContent = !chosen.length ? "All scores" : chosen.length === 4 ? "All 4 ranges" : chosen.map(range => range.label.replace(" points", "")).join(", ");
  for (const range of scoreRanges) $("score-" + range.value).checked = selectedScoreRanges.has(range.value);
}

function renderAccountMenu() {
  accountSuggestionIndex = Math.min(accountSuggestionIndex, accountSuggestions.length - 1);
  $("account-options").hidden = !accountDropdownOpen;
  $("search").setAttribute("aria-expanded", String(accountDropdownOpen));
  $("account-options").innerHTML = accountSuggestions.length ? accountSuggestions.map((row, index) =>
    `<button type="button" role="option" tabindex="-1" id="account-option-${index}" data-account="${row.account_id}" aria-selected="${index === accountSuggestionIndex}"><span>${escapeHtml(row.name)}</span><small>${row.account_id} · ${escapeHtml(row.industry)}</small></button>`).join("") : '<p class="account-no-match">No matching accounts</p>';
  if (accountDropdownOpen && accountSuggestionIndex >= 0) $("search").setAttribute("aria-activedescendant", `account-option-${accountSuggestionIndex}`);
  else $("search").removeAttribute("aria-activedescendant");
}

function chooseAccount(accountId) {
  const account = accountSuggestions.find(row => row.account_id === accountId);
  if (!account) return;
  $("search").value = account.name;
  accountDropdownOpen = false; accountSuggestionIndex = -1;
  page = 0; selected = null; render();
}

function reconcileAccountSelection() {
  // Preserve typed search; clear an exact selected account if new filters exclude it.
  const query = $("search").value.trim().toLowerCase();
  const exactAccount = row => row.name.toLowerCase() === query || row.account_id.toLowerCase() === query;
  if (query && data.candidates.some(exactAccount) && !candidatesForFilters().some(exactAccount)) $("search").value = "";
}

function distributionGroups(rows) {
  return {
    industries: [...new Set(data.candidates.map(row => row.industry))].sort().map(industry => ({
      value: industry, label: industry, count: rows.filter(row => row.industry === industry).length
    })),
    scores: scoreRanges.map(range => ({...range, count: rows.filter(row => matchesScore(row.score, range.value)).length}))
  };
}

function chartMarkup(groups, filterId, total) {
  return groups.map(group => {
    const isScore = filterId === "score-range";
    const active = isScore ? selectedScoreRanges.has(group.value) : $(filterId).value === group.value;
    const percentage = total ? group.count / total * 100 : 0;
    return `<button class="chart-bar${active ? " active" : ""}" data-filter="${filterId}" data-value="${escapeHtml(group.value)}" aria-pressed="${active}" aria-label="${escapeHtml(group.label)}: ${group.count} product opportunities, ${percentage.toFixed(1)} percent. ${active ? (isScore ? "Remove this range" : "Clear this filter") : (isScore ? "Add this range" : "Filter to this group")}" ${group.count === 0 && !active && !isScore ? "disabled" : ""}>
      <span class="chart-bar-label">${escapeHtml(group.label)}</span><span class="chart-bar-value">${group.count}</span><span class="chart-bar-share">${percentage.toFixed(1)}%</span>
      <span class="chart-track"><span style="width:${percentage}%"></span></span></button>`;
  }).join("");
}

function renderDistributions() {
  const groups = distributionGroups(filtered);
  $("distribution-summary").textContent = filtered.length
    ? `${filtered.length} matching product opportunities · ${new Set(filtered.map(row => row.account_id)).size} unique accounts · all active filters applied`
    : "No matching opportunities. Adjust or reset your filters.";
  $("industry-chart").innerHTML = chartMarkup(groups.industries, "industry", filtered.length);
  $("score-chart").innerHTML = chartMarkup(groups.scores, "score-range", filtered.length);
}

function applyChartFilter(filterId, value) {
  if (filterId === "score-range") {
    if (selectedScoreRanges.has(value)) selectedScoreRanges.delete(value);
    else selectedScoreRanges.add(value);
  } else $(filterId).value = $(filterId).value === value ? "" : value;
  reconcileAccountSelection();
  page = 0; selected = null; render();
}

function resetFilters() {
  for (const id of ["search", "product", "region", "industry"]) $(id).value = "";
  selectedScoreRanges.clear();
  $("score-picker").open = false;
  accountDropdownOpen = false; accountSuggestionIndex = -1;
  $("incomplete").checked = false;
  page = 0; selected = null; render();
}

function populate(id, values) {
  for (const value of [...new Set(values)].sort()) {
    const option = document.createElement("option"); option.value = value; option.textContent = value; $(id).append(option);
  }
}

function detail(row) {
  if (!row) { $("detail").innerHTML = '<p class="empty">No matching accounts. Adjust your filters to explore opportunities.</p>'; return; }
  const parts = [["Product fit", "fit", 30], ["Relevant engagement", "engagement", 30], ["Engagement recency", "recency", 20], ["Complementary ownership", "complement", 20]];
  $("detail").innerHTML = `<p class="eyebrow">ACCOUNT EXPLORER</p><h2>${escapeHtml(row.name)}</h2>
    <p class="account-sub">${escapeHtml(row.account_id)} · ${escapeHtml(row.region)} · ${escapeHtml(row.industry)}<br>${escapeHtml(row.size_band)} · ${row.employees.toLocaleString()} employees</p>
    <p class="target-label">RECOMMENDED PRODUCT</p><div class="target-name">${escapeHtml(row.product_name)}</div>
    <div class="big-score"><strong>${row.score}<small> / 100</small></strong><span>${row.evidence_complete ? "RULE-BASED PRIORITY" : "INCOMPLETE EVIDENCE"}</span></div>
    ${parts.map(([label, field, max]) => `<div class="component"><div><span>${label}</span><span>${row.components[field]} / ${max}</span></div><div class="bar"><i style="width:${row.components[field] / max * 100}%"></i></div>${row.component_reasons ? `<p class="component-note">${escapeHtml(row.component_reasons[field])}</p>` : ""}</div>`).join("")}
    <div class="owned">Current products: ${row.owned_products.map(escapeHtml).join(", ")}</div>
    <div class="brief"><h3>Evidence brief · template generated</h3><p>${escapeHtml(row.brief)}</p></div>
    <p class="next-action"><strong>Suggested next action</strong><br>${escapeHtml(row.suggested_action)}</p>`;
}

function render() {
  const query = $("search").value.trim().toLowerCase();
  filtered = candidatesForFilters().filter(row => !query || `${row.name} ${row.account_id}`.toLowerCase().includes(query));
  syncFilterControls();
  renderDistributions();
  page = Math.max(0, Math.min(page, Math.ceil(filtered.length / pageSize) - 1));
  if (!filtered.some(row => key(row) === selected)) selected = filtered[0] ? key(filtered[0]) : null;
  $("count").textContent = `${filtered.length} eligible product opportunities · score, then account ID order`;
  const slice = filtered.slice(page * pageSize, (page + 1) * pageSize);
  $("rows").innerHTML = slice.length ? slice.map(row => `<tr class="${key(row) === selected ? "selected" : ""}"><td><button class="account-button" data-key="${key(row)}" aria-label="Explore ${escapeHtml(row.name)} for ${escapeHtml(row.product_name)}">${escapeHtml(row.name)}</button><small>${escapeHtml(row.region)} · ${escapeHtml(row.industry)}</small></td><td>${escapeHtml(row.product_name)}<small>${escapeHtml(row.size_band)}</small></td><td><div class="score-cell"><strong>${row.score}</strong><span class="bar"><i style="width:${row.score}%"></i></span></div></td><td><span class="tag ${row.evidence_complete ? "" : "gap"}">${row.evidence_complete ? "Engagement data available" : "Engagement data missing"}</span></td></tr>`).join("") : '<tr><td colspan="4" class="empty">No matching accounts. Try clearing a filter.</td></tr>';
  $("page").textContent = filtered.length ? `Page ${page + 1} of ${Math.ceil(filtered.length / pageSize)}` : "0 results";
  $("previous").disabled = page === 0; $("next").disabled = (page + 1) * pageSize >= filtered.length;
  $("export").disabled = !filtered.some(row => row.evidence_complete);
  detail(filtered.find(row => key(row) === selected));
}

function download() {
  // Coverage gaps are review-only and never silently become campaign targets.
  const targets = filtered.filter(row => row.evidence_complete).slice(0, 50);
  const fields = ["account_id", "name", "region", "industry", "product_id", "product_name", "score", "evidence_complete", "brief", "suggested_action"];
  const csvCell = value => '"' + String(value).replace(/"/g, '""') + '"';
  const csv = [fields.map(csvCell).join(","), ...targets.map(row => fields.map(f => csvCell(row[f])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], {type: "text/csv;charset=utf-8;"}));
  const link = document.createElement("a"); link.href = url; link.download = `campaign-audience-${data.as_of}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("count").textContent = `Exported ${targets.length} product opportunities with complete coverage.`;
}

if (data) {
  $("accounts").textContent = data.account_count.toLocaleString();
  $("eligible").textContent = data.candidates.length.toLocaleString();
  const ready = data.candidates.filter(row => row.evidence_complete).length;
  $("ready").textContent = ready.toLocaleString(); $("gaps").textContent = (data.candidates.length - ready).toLocaleString();
  populate("product", data.candidates.map(row => row.product_name)); populate("region", data.candidates.map(row => row.region)); populate("industry", data.candidates.map(row => row.industry));
  for (const id of ["search", "product", "region", "industry", "incomplete"]) $(id).addEventListener(id === "search" ? "input" : "change", () => {
    if (id !== "search") reconcileAccountSelection();
    else {accountDropdownOpen = true; accountSuggestionIndex = -1;}
    page = 0; selected = null; render();
  });
  for (const range of scoreRanges) $("score-" + range.value).addEventListener("change", () => applyChartFilter("score-range", range.value));
  $("all-scores").addEventListener("click", () => {selectedScoreRanges.clear(); page = 0; selected = null; render();});
  document.addEventListener("click", event => {
    if (!$("score-picker").contains(event.target)) $("score-picker").open = false;
    if (!$("account-picker").contains(event.target)) {accountDropdownOpen = false; renderAccountMenu();}
  });
  for (const type of ["focus", "click"]) $("search").addEventListener(type, () => {accountDropdownOpen = true; renderAccountMenu();});
  $("account-toggle").addEventListener("click", () => {accountDropdownOpen = !accountDropdownOpen; accountSuggestionIndex = -1; renderAccountMenu();});
  $("account-options").addEventListener("mousedown", event => event.preventDefault());
  $("account-options").addEventListener("click", event => {const option = event.target.closest("button[data-account]"); if (option) chooseAccount(option.dataset.account);});
  $("search").addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); accountDropdownOpen = true;
      accountSuggestionIndex = Math.max(0, Math.min(accountSuggestions.length - 1, accountSuggestionIndex + (event.key === "ArrowDown" ? 1 : -1)));
      renderAccountMenu(); $("account-options").querySelector('[aria-selected="true"]')?.scrollIntoView({block:"nearest"});
    } else if (event.key === "Enter" && accountDropdownOpen && accountSuggestionIndex >= 0) {
      event.preventDefault(); chooseAccount(accountSuggestions[accountSuggestionIndex].account_id);
    } else if (event.key === "Escape" || event.key === "Tab") {accountDropdownOpen = false; renderAccountMenu();}
  });
  $("score-picker").addEventListener("keydown", event => {if (event.key === "Escape") {$("score-picker").open = false; $("score-picker").querySelector("summary").focus();}});
  for (const id of ["industry-chart", "score-chart"]) $(id).addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    const filterId = button.dataset.filter, value = button.dataset.value;
    applyChartFilter(filterId, value);
    $(id).querySelector(`button[data-value="${value}"]`)?.focus();
  });
  $("reset-filters").addEventListener("click", resetFilters);
  $("rows").addEventListener("click", event => { const button = event.target.closest("button[data-key]"); if (button) {selected = button.dataset.key; render(); $("rows").querySelector(`button[data-key="${selected}"]`)?.focus();} });
  $("previous").addEventListener("click", () => {page--; selected = key(filtered[page * pageSize]); render();});
  $("next").addEventListener("click", () => {page++; selected = key(filtered[page * pageSize]); render();});
  $("export").addEventListener("click", download); render();
} else { $("count").textContent = "Demo data is missing. Run python build.py, then reload this page."; }
