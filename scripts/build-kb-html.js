#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVICES_PATH = path.join(ROOT, 'src', 'data', 'services.json');
const TEMPLATES_PATH = path.join(ROOT, 'src', 'data', 'templates.json');
const ENGINE_PATH = path.join(ROOT, 'src', 'lib', 'kbEngine.js');
const OUTPUT_PATH = path.join(ROOT, 'outputs', 'kb.html');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// 避免資料字串裡若出現 </script> 之類的內容意外提前結束 <script> 標籤
function safeEmbed(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildHtml({ catalog, templates, engineSource }) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AS400 SQL Service 知識庫</title>
<style>
  :root {
    --ink: #17222d;
    --muted: #55677a;
    --paper: #eef1f6;
    --surface: #ffffff;
    --surface-alt: #f4f7fa;
    --border: #d7dee6;
    --border-strong: #c1cbd6;
    --accent: #0e5c73;
    --accent-ink: #ffffff;
    --accent-soft: #d9ecf1;
    --error: #b3261e;
    --error-bg: #fdecea;
    --warn: #8a4a00;
    --warn-bg: #fbeee0;
    --success: #2f7a4f;
    --shadow: rgba(23, 34, 45, 0.10);
    --mono: Consolas, "Cascadia Code", "SFMono-Regular", Menlo, monospace;
    --sans: "Segoe UI", "Microsoft JhengHei", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  html { scrollbar-gutter: stable; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--sans);
    line-height: 1.5;
    font-size: 16px;
  }
  header { padding: 22px 28px 16px; max-width: 1500px; margin: 0 auto; }
  header h1 { margin: 0; font-size: 27px; letter-spacing: -0.01em; }
  header p { margin: 6px 0 0; color: var(--muted); font-size: 15px; }
  main { max-width: 1500px; margin: 0 auto; padding: 0 28px 60px; }
  .toolbar {
    position: sticky; top: 0; z-index: 5; background: var(--paper);
    padding: 12px 0 10px; display: flex; flex-wrap: wrap; gap: 10px 14px;
    align-items: center; border-bottom: 1px solid var(--border);
  }
  .search-wrap { position: relative; flex: 1 1 260px; }
  .search-wrap svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.55; }
  #keyword-input {
    width: 100%; padding: 11px 12px 11px 36px; border: 1px solid var(--border-strong);
    border-radius: 8px; background: var(--surface); color: var(--ink); font-size: 16px; font-family: inherit;
  }
  #keyword-input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
  .chip-group { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .chip-group-label {
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    color: var(--muted); flex: none;
  }
  .chip-row { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; background: var(--surface); color: var(--ink);
    border: 1px solid var(--border-strong); border-radius: 999px; padding: 7px 13px 7px 10px;
    font-size: 14px; cursor: pointer; font-family: inherit;
  }
  .chip.chip-type { border-radius: 6px; }
  .chip .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
  .chip.chip-type .dot { border-radius: 3px; }
  .chip:hover { border-color: var(--accent); }
  .chip.active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .chip.active .dot { background: var(--accent-ink) !important; }
  .result-count-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 10px 0 4px; }
  .result-count { font-size: 13.5px; color: var(--muted); }
  .group-controls { display: none; gap: 10px; flex: none; }
  .group-controls.visible { display: flex; }
  .group-controls button {
    background: none; border: none; color: var(--accent); font-size: 13px; cursor: pointer;
    text-decoration: underline; font-family: inherit; padding: 2px;
  }

  .ptf-level-panel {
    display: none; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 4px;
    padding: 8px 12px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 8px;
    font-size: 13px; color: var(--muted);
  }
  .ptf-level-panel.visible { display: flex; }
  .ptf-level-panel label { font-weight: 600; color: var(--ink); }
  .ptf-level-panel #ptf-group-name { font-family: var(--mono); color: var(--accent); }
  #ptf-level-input {
    width: 80px; padding: 5px 8px; border: 1px solid var(--border-strong); border-radius: 6px;
    background: var(--paper); color: var(--ink); font-size: 13px; font-family: inherit;
  }
  .ptf-level-hint code { font-family: var(--mono); background: var(--surface-alt); padding: 2px 6px; border-radius: 4px; }
  #ptf-level-copy {
    background: none; border: 1px solid var(--accent); color: var(--accent); border-radius: 6px;
    padding: 3px 10px; font-size: 12.5px; cursor: pointer; font-family: inherit;
  }
  #ptf-level-copy-status { color: var(--accent); font-size: 12px; }

  .ptf-report {
    display: none; margin-top: 8px; padding: 12px 14px; background: var(--accent-soft);
    border: 1px solid var(--accent); border-radius: 8px;
  }
  .ptf-report.visible { display: block; }
  .ptf-report-summary { font-size: 15px; font-weight: 700; color: var(--ink); line-height: 1.6; }
  .ptf-report-summary .highlight { color: var(--accent); }
  .ptf-report-unlocked { margin-top: 6px; font-size: 13px; color: var(--ink); }
  .ptf-report-unlocked ul { margin: 4px 0 0; padding-left: 20px; }
  .ptf-report-unlocked li { font-family: var(--mono); font-size: 12.5px; margin: 2px 0; }
  .ptf-report-actions { margin-top: 8px; }
  #ptf-report-copy {
    background: var(--accent); color: var(--accent-ink); border: none; border-radius: 6px;
    padding: 6px 14px; font-size: 13px; cursor: pointer; font-family: inherit;
  }
  #ptf-report-copy-status { color: var(--accent); font-size: 12px; margin-left: 8px; }

  .svc-req.status-available { color: var(--success); }
  .svc-req.status-needs-ptf { color: var(--warn); }
  .svc-req.status-info { color: var(--muted); }
  .svc-req.status-unknown { color: var(--muted); }

  .active-filters { display: none; align-items: center; flex-wrap: wrap; gap: 7px; margin: 10px 0 0; }
  .active-filters.visible { display: flex; }
  .active-filters-label { font-size: 12.5px; color: var(--muted); flex: none; }
  .filter-tag {
    display: inline-flex; align-items: center; gap: 6px; background: var(--accent-soft); color: var(--ink);
    border: 1px solid var(--accent); border-radius: 999px; padding: 4px 8px 4px 11px; font-size: 13px;
  }
  .filter-tag button {
    background: none; border: none; color: var(--muted); cursor: pointer; font-size: 15px; line-height: 1;
    padding: 0 2px; font-family: inherit;
  }
  .filter-tag button:hover { color: var(--warn); }
  .clear-all-btn {
    background: none; border: none; color: var(--accent); font-size: 13px; cursor: pointer;
    text-decoration: underline; font-family: inherit; padding: 4px 2px;
  }

  .table-scroll { overflow-x: auto; }
  table.catalog { width: 1440px; max-width: none; table-layout: fixed; border-collapse: collapse; font-size: 15.5px; }
  table.catalog thead th {
    text-align: left; font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: var(--muted); padding: 8px 10px; border-bottom: 1px solid var(--border);
    background: var(--paper); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  tr.group-header { cursor: pointer; }
  tr.group-header td {
    padding: 8px 10px; border-bottom: 1px solid var(--border); background: var(--paper);
    font-size: 13.5px; font-weight: 700; color: var(--ink);
  }
  tr.group-header .chev { display: inline-block; width: 16px; text-align: center; color: var(--muted); transition: transform 0.15s ease; }
  tr.group-header.collapsed .chev { transform: rotate(-90deg); }
  tr.group-header .group-count { color: var(--muted); font-weight: 500; margin-left: 4px; }
  tr.row { cursor: pointer; }
  tr.row td { padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: top; overflow-wrap: break-word; }
  tr.row:hover td { background: var(--surface-alt); }
  tr.row.expanded td { background: var(--accent-soft); }
  .cat-dot { width: 9px; height: 9px; border-radius: 3px; }
  td.col-name { width: 510px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .svc-name { font-family: var(--mono); font-size: 14.5px; font-weight: 700; display: flex; align-items: flex-start; gap: 4px; white-space: nowrap; }
  .svc-req { font-size: 12.5px; color: var(--accent); margin-top: 2px; white-space: normal; }
  td.col-desc { width: 540px; color: var(--ink); white-space: normal; }
  td.col-type { width: 150px; }
  .type-pill {
    display: inline-block; font-size: 12px; padding: 3px 9px; border-radius: 999px; font-weight: 600;
    font-family: var(--mono); white-space: nowrap;
    background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent);
  }
  td.col-action { width: 240px; text-align: right; }
  .chev { display: inline-block; width: 16px; flex: none; text-align: center; color: var(--muted); transition: transform 0.15s ease; }
  tr.row.expanded .chev { transform: rotate(90deg); color: var(--accent); }
  button.gen-btn-sm {
    display: block; margin-left: auto; max-width: 220px;
    background: var(--accent); color: var(--accent-ink); border: none; border-radius: 6px;
    padding: 8px 13px; font-size: 14px; font-family: inherit; cursor: pointer;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  button.gen-btn-sm + button.gen-btn-sm { margin-top: 6px; }
  button.gen-btn-sm:hover { opacity: 0.9; }
  tr.detail-row td { padding: 0; border-bottom: 1px solid var(--border); }
  .detail-inner { display: none; padding: 12px 16px 16px 38px; background: var(--surface-alt); font-size: 14px; }
  tr.detail-row.open .detail-inner { display: block; }
  .spec-label { color: var(--muted); font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.03em; margin-right: 8px; }
  table.ptf { border-collapse: collapse; margin-top: 8px; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  table.ptf th, table.ptf td { text-align: left; padding: 4px 12px 4px 0; border-bottom: 1px solid var(--border); }
  table.ptf th { color: var(--muted); font-weight: 600; font-size: 12px; white-space: nowrap; }
  table.ptf td.not-base { color: var(--warn); font-weight: 600; }
  .action-warning {
    font-size: 13px; color: var(--warn); background: var(--warn-bg);
    border-left: 3px solid var(--warn); padding: 7px 11px; margin: 8px 0 0; border-radius: 4px;
  }

  .back-to-top {
    position: fixed; right: 24px; bottom: 24px; width: 44px; height: 44px; border-radius: 50%;
    background: var(--accent); color: var(--accent-ink); border: none; box-shadow: 0 4px 14px var(--shadow);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    opacity: 0; transform: translateY(8px); pointer-events: none;
    transition: opacity 0.18s ease, transform 0.18s ease; z-index: 15;
  }
  .back-to-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
  .back-to-top:hover { opacity: 0.9; }

  .overlay { position: fixed; inset: 0; background: rgba(10, 16, 22, 0.35); opacity: 0; pointer-events: none; transition: opacity 0.18s ease; z-index: 20; }
  .overlay.open { opacity: 1; pointer-events: auto; }
  .drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: min(500px, 100vw);
    background: var(--surface); box-shadow: -8px 0 24px var(--shadow);
    transform: translateX(100%); transition: transform 0.2s ease; z-index: 21; display: flex; flex-direction: column;
  }
  .drawer.open { transform: translateX(0); }
  .drawer-head { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
  .drawer-head h3 { margin: 0 0 4px; font-size: 17px; font-family: var(--mono); }
  .drawer-head p { margin: 0; font-size: 13.5px; color: var(--muted); }
  .drawer-close { background: none; border: none; font-size: 22px; color: var(--muted); cursor: pointer; line-height: 1; }
  .drawer-body { padding: 14px 20px; overflow-y: auto; flex: 1; }
  .field-row { padding: 9px 0; border-bottom: 1px solid var(--border); }
  .field-row:last-child { border-bottom: none; }
  .field-row label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 5px; }
  .field-row input, .field-row select {
    width: 100%; padding: 9px 10px; border: 1px solid var(--border-strong);
    border-radius: 6px; background: var(--paper); color: var(--ink); font-size: 14.5px; font-family: inherit;
  }
  .adv-toggle { background: none; border: none; color: var(--accent); font-size: 14px; padding: 8px 0; cursor: pointer; text-decoration: underline; font-family: inherit; }
  .adv-fields { display: none; }
  .adv-fields.open { display: block; }
  .drawer-actions { display: flex; flex-direction: column; gap: 8px; margin: 12px 0 4px; }
  .drawer-actions .btn-row { display: flex; gap: 8px; }
  button.gen-btn {
    background: var(--accent); color: var(--accent-ink); border: none; border-radius: 6px;
    padding: 10px 16px; font-size: 14.5px; font-family: inherit; cursor: pointer;
  }
  button.secondary {
    background: var(--surface); color: var(--accent); border: 1px solid var(--accent);
    border-radius: 6px; padding: 10px 16px; font-size: 14.5px; cursor: pointer; font-family: inherit;
  }
  .validation-msg {
    display: none; color: var(--error); background: var(--error-bg); border: 1px solid #f3c6c2;
    border-radius: 6px; padding: 8px 12px; font-size: 13.5px; margin-top: 4px;
  }
  .validation-msg.show { display: block; }
  pre#sql-output {
    background: #10161c; color: #d7e0ea; padding: 14px; border-radius: 8px;
    font-family: var(--mono); font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word;
    margin-top: 14px; display: none;
  }
  .copy-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
  #copy-btn { display: none; }
  #copy-status { font-size: 13px; display: none; }
  #copy-status.ok { color: #146c3e; }
  #copy-status.fail { color: var(--error); }
  footer#disclaimer {
    max-width: 1220px; margin: 0 auto; padding: 0 28px 30px; font-size: 12.5px; color: var(--muted);
  }
</style>
</head>
<body>
<header>
  <h1>AS400 SQL Service 知識庫</h1>
  <p>查詢 IBM i SQL Service 所需 OS 版本/PTF，選擇情境並填寫參數即可快速產生可複製的 SQL。</p>
</header>
<main>
  <div class="toolbar">
    <div class="search-wrap">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input id="keyword-input" type="text" placeholder="搜尋 service 名稱、描述、關鍵字…">
    </div>
    <div class="chip-group"><span class="chip-group-label">分類</span><div class="chip-row" id="category-chips"></div></div>
    <div class="chip-group"><span class="chip-group-label">類型</span><div class="chip-row" id="type-chips"></div></div>
    <div class="chip-group"><span class="chip-group-label">OS版本</span><div class="chip-row" id="version-chips"></div></div>
    <div class="ptf-level-panel" id="ptf-level-panel">
      <label for="ptf-level-input">目前 <span id="ptf-group-name"></span> Level</label>
      <input id="ptf-level-input" type="number" min="0" placeholder="例如 20">
      <span class="ptf-level-hint">查詢指令：<code id="ptf-level-sql"></code></span>
      <button type="button" id="ptf-level-copy">複製</button>
      <span id="ptf-level-copy-status"></span>
    </div>
    <div class="ptf-report" id="ptf-report">
      <div class="ptf-report-summary" id="ptf-report-summary"></div>
      <div class="ptf-report-unlocked" id="ptf-report-unlocked"></div>
      <div class="ptf-report-actions">
        <button type="button" id="ptf-report-copy">複製報告</button>
        <span id="ptf-report-copy-status"></span>
      </div>
    </div>
  </div>
  <div class="active-filters" id="active-filters"></div>
  <div class="result-count-row">
    <div class="result-count" id="result-count"></div>
    <div class="group-controls" id="group-controls">
      <button type="button" id="expand-all-btn">全部展開</button>
      <button type="button" id="collapse-all-btn">全部收合</button>
    </div>
  </div>
  <div class="table-scroll">
  <table class="catalog">
    <colgroup>
      <col style="width:510px"><col style="width:540px"><col style="width:150px"><col style="width:240px">
    </colgroup>
    <thead><tr><th>Service</th><th>說明</th><th>類型</th><th></th></tr></thead>
    <tbody id="service-body"></tbody>
  </table>
  </div>
</main>
<button id="back-to-top" class="back-to-top" type="button" aria-label="回到頂部" title="回到頂部">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
</button>
<footer id="disclaimer"></footer>

<div class="overlay" id="overlay"></div>
<div class="drawer" id="drawer">
  <div class="drawer-head">
    <div><h3 id="drawer-title"></h3><p id="drawer-desc"></p></div>
    <button class="drawer-close" id="drawer-close">&times;</button>
  </div>
  <div class="drawer-body">
    <div id="form-fields"></div>
    <button type="button" class="adv-toggle" id="adv-toggle" hidden></button>
    <div class="adv-fields" id="adv-fields"></div>
    <div class="drawer-actions">
      <div class="validation-msg" id="validation-msg"></div>
      <div class="btn-row">
        <button class="gen-btn" id="generate-btn"></button>
        <button class="secondary" id="reset-btn" type="button">重設為預設值</button>
      </div>
    </div>
    <pre id="sql-output"></pre>
    <div class="copy-row">
      <button class="secondary" id="copy-btn"></button>
      <span id="copy-status"></span>
    </div>
  </div>
</div>

<script>
${engineSource}
</script>
<script>
(function () {
  'use strict';
  var catalog = ${safeEmbed(catalog)};
  var templates = ${safeEmbed(templates)};

  var CATEGORY_PALETTE = ['#0e5c73', '#7a4fa0', '#b5562f', '#2f7a4f', '#a1547a', '#3f6fae', '#8a7a1f', '#c04545', '#3f8a86'];
  var categoryColor = {};
  (function assignColors() {
    var seen = [];
    catalog.services.forEach(function (s) { if (seen.indexOf(s.category) === -1) seen.push(s.category); });
    seen.forEach(function (cat, i) { categoryColor[cat] = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]; });
  })();

  // 類型顏色：語意固定（Procedure是唯一會異動系統狀態的類型，用跟action-warning同一色系標示；
  // 其餘唯讀類型從色盤取色），未來若IBM i Services出現新類型會自動落到色盤，不會沒有顏色可用。
  var TYPE_COLOR_FIXED = { 'Procedure': '#b5562f' };
  var TYPE_PALETTE = ['#0e5c73', '#2f7a4f', '#3f6fae', '#7a4fa0', '#3f8a86', '#8a7a1f'];
  var typeColor = {};
  (function assignTypeColors() {
    var seen = [];
    catalog.services.forEach(function (s) { if (seen.indexOf(s.type) === -1) seen.push(s.type); });
    var paletteIndex = 0;
    seen.forEach(function (type) {
      if (TYPE_COLOR_FIXED[type]) {
        typeColor[type] = TYPE_COLOR_FIXED[type];
      } else {
        typeColor[type] = TYPE_PALETTE[paletteIndex % TYPE_PALETTE.length];
        paletteIndex += 1;
      }
    });
  })();

  var serviceBody = document.getElementById('service-body');
  var keywordInput = document.getElementById('keyword-input');
  var categoryChipsEl = document.getElementById('category-chips');
  var typeChipsEl = document.getElementById('type-chips');
  var versionChipsEl = document.getElementById('version-chips');
  var ptfLevelPanelEl = document.getElementById('ptf-level-panel');
  var ptfGroupNameEl = document.getElementById('ptf-group-name');
  var ptfLevelInputEl = document.getElementById('ptf-level-input');
  var ptfLevelSqlEl = document.getElementById('ptf-level-sql');
  var ptfLevelCopyBtn = document.getElementById('ptf-level-copy');
  var ptfLevelCopyStatusEl = document.getElementById('ptf-level-copy-status');
  var ptfReportEl = document.getElementById('ptf-report');
  var ptfReportSummaryEl = document.getElementById('ptf-report-summary');
  var ptfReportUnlockedEl = document.getElementById('ptf-report-unlocked');
  var ptfReportCopyBtn = document.getElementById('ptf-report-copy');
  var ptfReportCopyStatusEl = document.getElementById('ptf-report-copy-status');
  var backToTopBtn = document.getElementById('back-to-top');
  var resultCountEl = document.getElementById('result-count');
  var groupControlsEl = document.getElementById('group-controls');
  var expandAllBtn = document.getElementById('expand-all-btn');
  var collapseAllBtn = document.getElementById('collapse-all-btn');
  var activeFiltersEl = document.getElementById('active-filters');
  var disclaimerEl = document.getElementById('disclaimer');
  var activeCategory = '';
  var activeType = '';
  var activeVersion = '';
  var collapsedGroups = {};

  // OS版本清單：依資料裡出現的順序取唯一值(既有資料習慣由新到舊寫，如7.6/7.5/7.4/7.3)，
  // 另外準備一份由舊到新排序的陣列，供「最低需求版本」比對使用。
  var versionList = [];
  (function collectVersions() {
    catalog.services.forEach(function (s) {
      (s.ptfTable || []).forEach(function (row) {
        if (versionList.indexOf(row.version) === -1) versionList.push(row.version);
      });
    });
  })();
  var versionListAscending = versionList.slice().sort(function (a, b) { return parseFloat(a) - parseFloat(b); });

  // 判斷指定服務在指定OS版本是否可用：該版本原生內建(base)或有Enhanced PTF可用即算支援。
  function serviceSupportsVersion(service, version) {
    var row = (service.ptfTable || []).filter(function (r) { return r.version === version; })[0];
    if (!row) return false;
    return !!row.base || !!(row.enhanced && String(row.enhanced).trim());
  }

  // 服務實際最低可用版本(floor)：由舊到新找出第一個可用的版本，回傳它在versionListAscending裡的索引。
  function versionFloorIndex(service) {
    for (var i = 0; i < versionListAscending.length; i++) {
      if (serviceSupportsVersion(service, versionListAscending[i])) return i;
    }
    return versionListAscending.length;
  }

  // 篩選「X以上才能用」：服務的最低可用版本(floor)要落在X(含)之後，也就是這個服務在比X更舊的
  // 版本裡完全不可用。選越新的版本，篩選範圍越窄；選最舊的版本，因為所有服務至少都從它開始可用，
  // 篩選結果會等於全部服務。
  function serviceRequiresAtLeast(service, version) {
    var idx = versionListAscending.indexOf(version);
    if (idx === -1) return false;
    return versionFloorIndex(service) >= idx;
  }

  // 每個IBM i版本固定對應一個Db2 for i PTF Group，這是IBM官方命名，不是這份資料衍生出來的，
  // 經掃描全庫258筆ptfTable後確認全庫只出現這4個Group，不會有其他值。
  var PTF_GROUP_BY_VERSION = { '7.3': 'SF99703', '7.4': 'SF99704', '7.5': 'SF99950', '7.6': 'SF99960' };

  // 從enhanced文字裡抓出第一個「Level N」當作可用門檻；後面若有「Enhanced Level M」是加強功能，
  // 不是門檻，比對可用性只看第一個數字。
  function extractMinLevel(enhancedText) {
    var m = /Level\\s*(\\d+)/.exec(enhancedText || '');
    return m ? parseInt(m[1], 10) : null;
  }

  // 回傳這個service在指定版本、指定使用者PTF Level下的狀態：
  // 'available'(可直接使用) / 'needs-ptf'(PTF等級不足，附上門檻) / 'unknown'(官方對照表沒列PTF編號，無法自動比對)
  function servicePtfLevelStatus(service, version, userLevel) {
    var row = (service.ptfTable || []).filter(function (r) { return r.version === version; })[0];
    if (!row) return { status: 'unknown' };
    if (row.base) return { status: 'available' };
    var minLevel = extractMinLevel(row.enhanced);
    if (minLevel === null) return { status: 'unknown' };
    // 使用者還沒輸入Level：只能顯示門檻，不算「已比對」，跟下面「有輸入但不足」要用不同狀態，
    // 不然使用者打數字時畫面文字完全不變，會誤以為輸入沒有反應。
    if (userLevel === null || isNaN(userLevel)) return { status: 'info', minLevel: minLevel };
    return userLevel >= minLevel
      ? { status: 'available' }
      : { status: 'needs-ptf', minLevel: minLevel, userLevel: userLevel };
  }

  function currentPtfUserLevel() {
    var raw = ptfLevelInputEl.value;
    if (raw === '') return null;
    var n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }

  function updatePtfLevelPanel() {
    var group = PTF_GROUP_BY_VERSION[activeVersion];
    if (!activeVersion || !group) {
      ptfLevelPanelEl.classList.remove('visible');
      return;
    }
    ptfLevelPanelEl.classList.add('visible');
    ptfGroupNameEl.textContent = group;
    ptfLevelSqlEl.textContent = "SELECT PTF_GROUP_LEVEL FROM QSYS2.GROUP_PTF_INFO WHERE PTF_GROUP_NAME = '" + group + "'";
  }

  // 彙總目前清單(通常是已篩選過的lastRenderedList)在指定版本、指定Level下的可用狀況，
  // 算出「下一個門檻能解鎖多少個」——這是報告的核心價值，不是逐列打勾。
  // 只計入「這個版本有ptfTable row」的service，版本本身不支援的不算在分母裡。
  function computePtfReport(list, version, userLevel) {
    var applicableCount = 0;
    var availableCount = 0;
    var blocked = [];
    var unknownCount = 0;
    list.forEach(function (service) {
      var row = (service.ptfTable || []).filter(function (r) { return r.version === version; })[0];
      if (!row) return;
      applicableCount++;
      if (row.base) { availableCount++; return; }
      var minLevel = extractMinLevel(row.enhanced);
      if (minLevel === null) { unknownCount++; return; }
      if (userLevel >= minLevel) { availableCount++; }
      else { blocked.push({ service: service, minLevel: minLevel }); }
    });

    var nextLevel = null;
    var unlocked = [];
    if (blocked.length > 0) {
      nextLevel = Math.min.apply(null, blocked.map(function (b) { return b.minLevel; }));
      unlocked = blocked.filter(function (b) { return b.minLevel === nextLevel; }).map(function (b) { return b.service; });
    }

    return { total: applicableCount, availableCount: availableCount, nextLevel: nextLevel, unlocked: unlocked, unknownCount: unknownCount };
  }

  function buildPtfReportText(report, group, userLevel) {
    var lines = [];
    lines.push('PTF相容性報告 - ' + group + ' Level ' + userLevel);
    lines.push('目前可使用 ' + report.availableCount + ' / ' + report.total + ' 個相關service');
    if (report.nextLevel !== null) {
      lines.push('升級到 Level ' + report.nextLevel + ' 可再解鎖 ' + report.unlocked.length + ' 個：');
      report.unlocked.forEach(function (s) { lines.push('  - ' + s.name); });
    } else if (report.total > 0 && report.availableCount === report.total) {
      lines.push('目前等級已可使用全部相關service');
    }
    if (report.unknownCount > 0) {
      lines.push('另有 ' + report.unknownCount + ' 個service官方文件未列出PTF編號，需人工確認。');
    }
    return lines.join('\\n');
  }

  // 報告要回答的是「這個版本+這個Level整體上能用多少service」，不能沿用主表格的
  // 「floor(最早可用版本) >= X」篩選結果——那個篩選是給「找哪些是X版本才新增的」用的，
  // 套用在報告上會把分母錯誤地縮小成只剩「該版本才新增」的少數幾筆。報告只沿用關鍵字/
  // 分類/類型篩選，版本篩選交給computePtfReport內部用ptfTable row是否存在來判斷。
  function ptfReportBaseList() {
    var byKeyword = KBEngine.search(catalog, keywordInput.value);
    return byKeyword
      .filter(function (s) { return !activeCategory || s.category === activeCategory; })
      .filter(function (s) { return !activeType || s.type === activeType; });
  }

  function renderPtfReport() {
    var group = PTF_GROUP_BY_VERSION[activeVersion];
    var userLevel = currentPtfUserLevel();
    if (!activeVersion || !group || userLevel === null) {
      ptfReportEl.classList.remove('visible');
      return;
    }
    var report = computePtfReport(ptfReportBaseList(), activeVersion, userLevel);
    if (report.total === 0) {
      ptfReportEl.classList.remove('visible');
      return;
    }
    ptfReportEl.classList.add('visible');

    var summaryHtml = '目前 ' + escapeHtml(group) + ' Level ' + userLevel + ' 可使用 <span class="highlight">' +
      report.availableCount + ' / ' + report.total + '</span> 個相關service';
    if (report.nextLevel !== null) {
      summaryHtml += '，升級到 Level <span class="highlight">' + report.nextLevel + '</span> 可再解鎖 <span class="highlight">' +
        report.unlocked.length + '</span> 個';
    } else if (report.availableCount === report.total) {
      summaryHtml += '，已經可以使用全部相關service';
    }
    ptfReportSummaryEl.innerHTML = summaryHtml;

    var unlockedHtml = '';
    if (report.unlocked.length > 0) {
      unlockedHtml += '解鎖清單：<ul>' + report.unlocked.map(function (s) { return '<li>' + escapeHtml(s.name) + '</li>'; }).join('') + '</ul>';
    }
    if (report.unknownCount > 0) {
      unlockedHtml += '<div style="margin-top:6px;color:var(--muted);">另有 ' + report.unknownCount + ' 個service官方文件未列出PTF編號，無法自動判斷，需人工確認。</div>';
    }
    ptfReportUnlockedEl.innerHTML = unlockedHtml;
  }

  disclaimerEl.textContent = '注意：' + ((catalog.meta && catalog.meta.disclaimer) || '本知識庫內容未經人工核實，請以官方文件為準。');

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function templatesForService(serviceId) {
    return templates.filter(function (t) { return t.serviceId === serviceId; });
  }

  function renderCategoryChips() {
    categoryChipsEl.innerHTML = '';
    Object.keys(categoryColor).forEach(function (category) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (category === activeCategory ? ' active' : '');
      chip.innerHTML = '<span class="dot" style="background:' + categoryColor[category] + '"></span>' + escapeHtml(category);
      chip.addEventListener('click', function () {
        activeCategory = activeCategory === category ? '' : category;
        renderCategoryChips();
        applyFilters();
      });
      categoryChipsEl.appendChild(chip);
    });
  }

  function renderTypeChips() {
    typeChipsEl.innerHTML = '';
    Object.keys(typeColor).forEach(function (type) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip chip-type' + (type === activeType ? ' active' : '');
      chip.innerHTML = '<span class="dot" style="background:' + typeColor[type] + '"></span>' + escapeHtml(type);
      chip.addEventListener('click', function () {
        activeType = activeType === type ? '' : type;
        renderTypeChips();
        applyFilters();
      });
      typeChipsEl.appendChild(chip);
    });
  }

  function renderVersionChips() {
    versionChipsEl.innerHTML = '';
    updatePtfLevelPanel();
    versionList.forEach(function (version) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (version === activeVersion ? ' active' : '');
      chip.textContent = version + '+';
      chip.addEventListener('click', function () {
        activeVersion = activeVersion === version ? '' : version;
        renderVersionChips();
        applyFilters();
      });
      versionChipsEl.appendChild(chip);
    });
  }

  function applyFilters() {
    var byKeyword = KBEngine.search(catalog, keywordInput.value);
    var list = byKeyword
      .filter(function (s) { return !activeCategory || s.category === activeCategory; })
      .filter(function (s) { return !activeType || s.type === activeType; })
      .filter(function (s) { return !activeVersion || serviceRequiresAtLeast(s, activeVersion); });
    renderServiceList(list);
    renderActiveFilters();
    renderPtfReport();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function renderActiveFilters() {
    var tags = [];
    if (keywordInput.value) {
      tags.push({ label: '關鍵字：' + keywordInput.value, clear: function () { keywordInput.value = ''; } });
    }
    if (activeCategory) {
      tags.push({ label: '分類：' + activeCategory, clear: function () { activeCategory = ''; renderCategoryChips(); } });
    }
    if (activeType) {
      tags.push({ label: '類型：' + activeType, clear: function () { activeType = ''; renderTypeChips(); } });
    }
    if (activeVersion) {
      tags.push({ label: 'OS版本：' + activeVersion + '+', clear: function () { activeVersion = ''; renderVersionChips(); } });
    }

    activeFiltersEl.innerHTML = '';
    if (tags.length === 0) {
      activeFiltersEl.classList.remove('visible');
      return;
    }
    activeFiltersEl.classList.add('visible');

    var label = document.createElement('span');
    label.className = 'active-filters-label';
    label.textContent = '目前篩選：';
    activeFiltersEl.appendChild(label);

    tags.forEach(function (tag) {
      var el = document.createElement('span');
      el.className = 'filter-tag';
      var text = document.createElement('span');
      text.textContent = tag.label;
      el.appendChild(text);
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', '移除此篩選');
      removeBtn.addEventListener('click', function () {
        tag.clear();
        applyFilters();
      });
      el.appendChild(removeBtn);
      activeFiltersEl.appendChild(el);
    });

    var clearAllBtn = document.createElement('button');
    clearAllBtn.type = 'button';
    clearAllBtn.className = 'clear-all-btn';
    clearAllBtn.textContent = '清除全部';
    clearAllBtn.addEventListener('click', function () {
      keywordInput.value = '';
      activeCategory = '';
      activeType = '';
      activeVersion = '';
      renderCategoryChips();
      renderTypeChips();
      renderVersionChips();
      applyFilters();
    });
    activeFiltersEl.appendChild(clearAllBtn);
  }

  function buildPtfTableHtml(ptfTable) {
    var rows = ptfTable.map(function (row) {
      var baseCell = row.base
        ? '<td>Base</td>'
        : '<td class="not-base">需PTF</td>';
      return '<tr><td>' + escapeHtml(row.version) + '</td>' + baseCell + '<td>' + escapeHtml(row.enhanced || '') + '</td></tr>';
    }).join('');
    return '<table class="ptf"><thead><tr><th>版本</th><th>原生內建</th><th>Enhanced PTF</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function buildDetailHtml(service) {
    var html = '<span class="spec-label">最低 OS</span>' + escapeHtml(service.minOsVersion);
    html += buildPtfTableHtml(service.ptfTable);
    if (service.type === 'Procedure') {
      html += '<p class="action-warning">⚠ 此為執行動作類指令(CALL)，會異動系統設定，非唯讀查詢，執行前請確認影響範圍。</p>';
    }
    return html;
  }

  var lastRenderedList = [];

  // 依目前是否有選OS版本，決定service名稱下方小字要顯示「引導點擊」提示，
  // 還是實際的PTF Level比對狀態(綠色可用/橘色需升級/灰色需人工確認)。
  function svcReqLabel(service) {
    var group = PTF_GROUP_BY_VERSION[activeVersion];
    if (!activeVersion || !group) {
      return { text: '查看 OS/PTF 需求', statusClass: '' };
    }
    var result = servicePtfLevelStatus(service, activeVersion, currentPtfUserLevel());
    if (result.status === 'available') {
      return { text: '✓ 可直接使用', statusClass: 'status-available' };
    }
    if (result.status === 'info') {
      // 還沒輸入Level，只顯示門檻本身，用中性色，跟下面「已比對但不足」的橘色區分開。
      return { text: '需 ' + group + ' Level ' + result.minLevel + '+', statusClass: 'status-info' };
    }
    if (result.status === 'needs-ptf') {
      // 已經比對過(使用者有輸入Level)但不足，把輸入的數字也顯示出來，
      // 這樣使用者打數字時畫面文字才會真的跟著變，不會誤以為沒反應。
      var levelText = '目前 Level ' + result.userLevel + '，需升級到 ' + group + ' Level ' + result.minLevel + '+';
      return { text: levelText, statusClass: 'status-needs-ptf' };
    }
    return { text: '⚠ 官方未列PTF編號，需人工確認', statusClass: 'status-unknown' };
  }

  function appendServiceRows(service) {
    var row = document.createElement('tr');
    row.className = 'row';
    var reqLabel = svcReqLabel(service);
    row.innerHTML =
      '<td class="col-name"><span class="svc-name"><span class="chev">▸</span><span class="svc-name-text">' + escapeHtml(service.name) + '</span></span><span class="svc-req' + (reqLabel.statusClass ? ' ' + reqLabel.statusClass : '') + '">' + escapeHtml(reqLabel.text) + '</span></td>' +
      '<td class="col-desc">' + escapeHtml(service.description) + '</td>' +
      '<td class="col-type"><span class="type-pill">' + escapeHtml(service.type) + '</span></td>' +
      '<td class="col-action"></td>';

    var detailRow = document.createElement('tr');
    detailRow.className = 'detail-row';
    var detailInner = document.createElement('div');
    detailInner.className = 'detail-inner';
    detailInner.innerHTML = buildDetailHtml(service);
    var detailTd = document.createElement('td');
    detailTd.colSpan = 4;
    detailTd.appendChild(detailInner);
    detailRow.appendChild(detailTd);

    row.addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      row.classList.toggle('expanded');
      detailRow.classList.toggle('open');
    });

    var actionTd = row.querySelector('.col-action');
    var svcTemplates = templatesForService(service.id);
    var baseLabel = service.type === 'Procedure' ? '產生CALL指令' : '產生 SQL';
    svcTemplates.forEach(function (t) {
      var btn = document.createElement('button');
      btn.className = 'gen-btn-sm';
      // 同一個service對到多個模板時，光靠「產生SQL/產生CALL指令」無法分辨每顆按鈕的差異，
      // 這時把模板描述接在後面消歧義；只有一個模板時維持簡短標籤，避免不必要的長文字。
      btn.textContent = svcTemplates.length > 1 ? baseLabel + '：' + t.description : baseLabel;
      btn.title = t.description;
      btn.addEventListener('click', function () { openDrawer(t, service); });
      actionTd.appendChild(btn);
    });

    serviceBody.appendChild(row);
    serviceBody.appendChild(detailRow);
  }

  function appendGroupHeader(category, count) {
    var headerRow = document.createElement('tr');
    var isCollapsed = !!collapsedGroups[category];
    headerRow.className = 'group-header' + (isCollapsed ? ' collapsed' : '');
    var td = document.createElement('td');
    td.colSpan = 4;
    td.innerHTML =
      '<span class="chev">▾</span> ' +
      '<span class="cat-dot" style="background:' + categoryColor[category] + ';display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px;vertical-align:middle;"></span>' +
      escapeHtml(category) + '<span class="group-count">(' + count + ')</span>';
    headerRow.appendChild(td);
    headerRow.addEventListener('click', function () {
      collapsedGroups[category] = !collapsedGroups[category];
      renderServiceList(lastRenderedList);
    });
    serviceBody.appendChild(headerRow);
  }

  function renderServiceList(list) {
    lastRenderedList = list;
    resultCountEl.textContent = '共 ' + list.length + ' 筆';
    serviceBody.innerHTML = '';
    if (list.length === 0) {
      groupControlsEl.classList.remove('visible');
      var emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="4" style="padding:16px 10px;color:var(--muted);">找不到符合的 SQL Service。</td>';
      serviceBody.appendChild(emptyRow);
      return;
    }

    // 只有在未鎖定單一分類時才分組——鎖定分類後畫面本來就只剩一個分類，分組標題反而多餘，
    // 全部展開/收合按鈕也只在有分組時才有意義。
    if (activeCategory) {
      groupControlsEl.classList.remove('visible');
      list.forEach(appendServiceRows);
      return;
    }
    groupControlsEl.classList.add('visible');

    var byCategory = {};
    list.forEach(function (s) {
      if (!byCategory[s.category]) byCategory[s.category] = [];
      byCategory[s.category].push(s);
    });
    Object.keys(categoryColor).forEach(function (category) {
      var items = byCategory[category];
      if (!items || items.length === 0) return;
      appendGroupHeader(category, items.length);
      if (!collapsedGroups[category]) {
        items.forEach(appendServiceRows);
      }
    });
  }

  function paramDefaultValue(param) {
    return param.default !== undefined ? param.default : '';
  }

  function createFieldRow(param, prefill) {
    var row = document.createElement('div');
    row.className = 'field-row';
    var label = document.createElement('label');
    label.textContent = param.prompt + (param.required ? ' *' : '');
    row.appendChild(label);

    var value = prefill[param.name] !== undefined ? prefill[param.name] : paramDefaultValue(param);
    var field;
    if (param.options) {
      field = document.createElement('select');
      param.options.forEach(function (opt) {
        var optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt === '' ? '(不篩選)' : opt;
        field.appendChild(optionEl);
      });
    } else {
      field = document.createElement('input');
      field.type = param.type === 'datetime-local' ? 'datetime-local' : 'text';
    }
    field.dataset.name = param.name;
    field.dataset.type = param.type || 'text';
    field.value = value;
    row.appendChild(field);
    return row;
  }

  // ---- drawer / 表單 ----
  var overlay = document.getElementById('overlay');
  var drawer = document.getElementById('drawer');
  var drawerTitle = document.getElementById('drawer-title');
  var drawerDesc = document.getElementById('drawer-desc');
  var formFields = document.getElementById('form-fields');
  var advToggle = document.getElementById('adv-toggle');
  var advFields = document.getElementById('adv-fields');
  var generateBtn = document.getElementById('generate-btn');
  var resetBtn = document.getElementById('reset-btn');
  var validationMsg = document.getElementById('validation-msg');
  var sqlOutput = document.getElementById('sql-output');
  var copyBtn = document.getElementById('copy-btn');
  var copyStatus = document.getElementById('copy-status');

  function closeDrawer() { overlay.classList.remove('open'); drawer.classList.remove('open'); }
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  function openDrawer(template, service) {
    var isAction = service.type === 'Procedure';
    drawerTitle.textContent = service.name;
    drawerDesc.textContent = template.description;
    generateBtn.textContent = isAction ? '產生CALL指令' : '產生 SQL';
    copyBtn.textContent = isAction ? '複製指令' : '複製 SQL';
    formFields.innerHTML = '';
    advFields.innerHTML = '';
    advFields.classList.remove('open');
    sqlOutput.style.display = 'none';
    copyBtn.style.display = 'none';
    copyStatus.style.display = 'none';
    validationMsg.classList.remove('show');

    var params = template.params || [];
    var primaryParams = params.filter(function (p) { return !p.advanced; });
    var advancedParams = params.filter(function (p) { return p.advanced; });
    primaryParams.forEach(function (param) { formFields.appendChild(createFieldRow(param, {})); });
    advancedParams.forEach(function (param) { advFields.appendChild(createFieldRow(param, {})); });

    if (advancedParams.length > 0) {
      advToggle.hidden = false;
      advToggle.textContent = '顯示更多 ' + advancedParams.length + ' 個進階選項 ▾';
      advToggle.onclick = function () {
        var isOpen = advFields.classList.toggle('open');
        advToggle.textContent = (isOpen ? '收合進階選項 ▴' : '顯示更多 ' + advancedParams.length + ' 個進階選項 ▾');
      };
    } else {
      advToggle.hidden = true;
    }

    function collectParamValues() {
      var paramValues = {};
      formFields.querySelectorAll('input, select').forEach(readInputInto(paramValues));
      advFields.querySelectorAll('input, select').forEach(readInputInto(paramValues));
      return paramValues;
    }

    function readInputInto(paramValues) {
      return function (inp) {
        var raw = inp.value.trim();
        if (inp.dataset.type === 'datetime-local' && raw) {
          // datetime-local 的原始值一般是 "YYYY-MM-DDTHH:mm"，但若瀏覽器/OS設定讓欄位支援到秒，
          // 會變成 "YYYY-MM-DDTHH:mm:ss"，用冒號數量判斷，避免無條件補秒造成格式錯誤
          var colonCount = (raw.match(/:/g) || []).length;
          var withSeconds = colonCount >= 2 ? raw : raw + ':00';
          paramValues[inp.dataset.name] = "TIMESTAMP('" + withSeconds.replace('T', ' ') + "')";
        } else {
          paramValues[inp.dataset.name] = raw;
        }
      };
    }

    generateBtn.onclick = function () {
      var paramValues = collectParamValues();
      var missing = KBEngine.getMissingParams(template, paramValues);
      if (missing.length > 0) {
        validationMsg.textContent = '請填寫必填欄位：' + missing.map(function (m) { return m.prompt; }).join('、');
        validationMsg.classList.add('show');
        return;
      }
      validationMsg.classList.remove('show');
      var sql = KBEngine.fillTemplate(template, paramValues) + ';';
      sqlOutput.textContent = KBEngine.formatSql(sql);
      sqlOutput.style.display = 'block';
      copyBtn.style.display = 'inline-block';
      copyStatus.style.display = 'none';
    };

    resetBtn.onclick = function () {
      formFields.querySelectorAll('input, select').forEach(function (inp) {
        var param = params.filter(function (p) { return p.name === inp.dataset.name; })[0];
        inp.value = param ? paramDefaultValue(param) : '';
      });
      advFields.querySelectorAll('input, select').forEach(function (inp) {
        var param = params.filter(function (p) { return p.name === inp.dataset.name; })[0];
        inp.value = param ? paramDefaultValue(param) : '';
      });
      validationMsg.classList.remove('show');
      sqlOutput.style.display = 'none';
      copyBtn.style.display = 'none';
      copyStatus.style.display = 'none';
    };

    copyBtn.onclick = function () {
      var text = sqlOutput.textContent;
      var copyLabel = isAction ? '複製指令' : '複製 SQL';
      function showResult(ok) {
        copyStatus.textContent = ok ? '已複製！' : '複製失敗，請手動選取後複製 (Ctrl+C)';
        copyStatus.className = ok ? 'ok' : 'fail';
        copyStatus.style.display = 'inline';
        setTimeout(function () { copyStatus.style.display = 'none'; }, 2200);
      }
      function fallbackCopy() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          showResult(ok);
        } catch (e) {
          showResult(false);
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { showResult(true); }).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
      copyBtn.textContent = copyLabel;
    };

    overlay.classList.add('open');
    drawer.classList.add('open');
  }

  keywordInput.addEventListener('input', applyFilters);

  expandAllBtn.addEventListener('click', function () {
    Object.keys(categoryColor).forEach(function (category) { collapsedGroups[category] = false; });
    renderServiceList(lastRenderedList);
  });
  collapseAllBtn.addEventListener('click', function () {
    Object.keys(categoryColor).forEach(function (category) { collapsedGroups[category] = true; });
    renderServiceList(lastRenderedList);
  });

  ptfLevelInputEl.addEventListener('input', function () {
    renderServiceList(lastRenderedList);
    renderPtfReport();
  });
  ptfLevelCopyBtn.addEventListener('click', function () {
    var text = ptfLevelSqlEl.textContent;
    var done = function () {
      ptfLevelCopyStatusEl.textContent = '已複製';
      setTimeout(function () { ptfLevelCopyStatusEl.textContent = ''; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  });
  ptfReportCopyBtn.addEventListener('click', function () {
    var group = PTF_GROUP_BY_VERSION[activeVersion];
    var userLevel = currentPtfUserLevel();
    if (!group || userLevel === null) return;
    var report = computePtfReport(ptfReportBaseList(), activeVersion, userLevel);
    var text = buildPtfReportText(report, group, userLevel);
    var done = function () {
      ptfReportCopyStatusEl.textContent = '已複製';
      setTimeout(function () { ptfReportCopyStatusEl.textContent = ''; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  });

  renderCategoryChips();
  renderTypeChips();
  renderVersionChips();
  renderServiceList(catalog.services);

  window.addEventListener('scroll', function () {
    backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  backToTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
</script>
</body>
</html>
`;
}

function main() {
  const catalog = readJson(SERVICES_PATH);
  const templates = readJson(TEMPLATES_PATH);
  const engineSource = fs.readFileSync(ENGINE_PATH, 'utf8');

  const html = buildHtml({ catalog, templates, engineSource });

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
  console.log(`已產出: ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
