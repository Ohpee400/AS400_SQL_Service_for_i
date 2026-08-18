'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  search,
  getById,
  listByCategory,
  matchByKeyword,
  extractParams,
  getMissingParams,
  fillTemplate,
  formatSql
} = require('../../src/lib/kbEngine');

const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'services.sample.json');

function loadFixtureCatalog() {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

test('search matches by name, category, and description keywords', () => {
  const catalog = loadFixtureCatalog();
  assert.equal(search(catalog, '鎖定').length, 1);
  assert.equal(search(catalog, 'BIGFILE').length, 1);
  assert.equal(search(catalog, '不存在的關鍵字').length, 0);
});

test('search returns all services when keyword is empty', () => {
  const catalog = loadFixtureCatalog();
  assert.equal(search(catalog, '').length, 2);
});

test('getById returns matching service or null', () => {
  const catalog = loadFixtureCatalog();
  assert.equal(getById(catalog, 'sample_lock').name, 'QSYS2.SAMPLE_LOCK');
  assert.equal(getById(catalog, 'does_not_exist'), null);
});

test('listByCategory filters by category', () => {
  const catalog = loadFixtureCatalog();
  const results = listByCategory(catalog, '大檔案分析');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'sample_bigfile');
});

test('listByCategory returns all services when category is falsy', () => {
  const catalog = loadFixtureCatalog();
  assert.equal(listByCategory(catalog, null).length, 2);
});

const sampleTemplates = [
  {
    id: 'lock_check',
    serviceId: 'sample_lock',
    matchKeywords: ['鎖定', 'lock'],
    extract: {
      pattern: '([A-Za-z0-9_]+)/([A-Za-z0-9_]+)',
      groups: ['library', 'object']
    },
    params: [
      { name: 'library', prompt: 'lib?', required: true },
      { name: 'object', prompt: 'obj?', required: true },
      { name: 'objType', prompt: 'type?', default: '*FILE' }
    ],
    sqlTemplate: "SELECT * FROM TABLE (QSYS2.SAMPLE_LOCK(OBJECT_SCHEMA => '{library}', OBJECT_NAME => '{object}', OBJECT_TYPE => '{objType}')) X"
  },
  {
    id: 'bigfile_check',
    serviceId: 'sample_bigfile',
    matchKeywords: ['大檔案'],
    params: [{ name: 'library', prompt: 'lib?', required: true }],
    sqlTemplate: "SELECT * FROM QSYS2.SAMPLE_BIGFILE WHERE TABLE_SCHEMA = '{library}'"
  }
];

test('matchByKeyword finds templates whose keywords appear in input', () => {
  const matches = matchByKeyword(sampleTemplates, '查詢 LIB01/FILE01 是否被鎖定');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'lock_check');
});

test('matchByKeyword returns empty array when nothing matches', () => {
  assert.equal(matchByKeyword(sampleTemplates, '完全無關的句子').length, 0);
});

test('extractParams pulls named groups from input using template pattern', () => {
  const template = sampleTemplates[0];
  const params = extractParams(template, '查詢 LIB01/FILE01 是否被鎖定');
  assert.deepEqual(params, { library: 'LIB01', object: 'FILE01' });
});

test('extractParams returns empty object when template has no extract config', () => {
  const template = sampleTemplates[1];
  assert.deepEqual(extractParams(template, '查詢 LIB01/FILE01'), {});
});

test('getMissingParams reports required params without value or default', () => {
  const template = sampleTemplates[0];
  const missing = getMissingParams(template, { library: 'LIB01' });
  assert.equal(missing.length, 1);
  assert.equal(missing[0].name, 'object');
});

test('fillTemplate substitutes provided values and falls back to defaults', () => {
  const template = sampleTemplates[0];
  const sql = fillTemplate(template, { library: 'LIB01', object: 'FILE01' });
  assert.equal(
    sql,
    "SELECT * FROM TABLE (QSYS2.SAMPLE_LOCK(OBJECT_SCHEMA => 'LIB01', OBJECT_NAME => 'FILE01', OBJECT_TYPE => '*FILE')) X"
  );
});

test('fillTemplate uppercases values when param.upper is set', () => {
  const template = {
    id: 'upper_check',
    serviceId: 'sample_lock',
    params: [
      { name: 'library', prompt: 'lib?', required: true, upper: true },
      { name: 'path', prompt: 'path?', default: '/home/MixedCase' }
    ],
    sqlTemplate: "SELECT * FROM QSYS2.SAMPLE WHERE LIB = '{library}' AND PATH = '{path}'"
  };
  const sql = fillTemplate(template, { library: 'mylib' });
  assert.equal(sql, "SELECT * FROM QSYS2.SAMPLE WHERE LIB = 'MYLIB' AND PATH = '/home/MixedCase'");
});

test('fillTemplate omits [paramName:...] clauses entirely when the param is blank', () => {
  const template = {
    id: 'conditional_clause_check',
    serviceId: 'sample_lock',
    params: [
      { name: 'jobName', prompt: 'job?', required: true },
      { name: 'jobEndMaximum', prompt: 'max?', default: '' },
      { name: 'iterationCount', prompt: 'count?', default: '100' }
    ],
    sqlTemplate: "CALL SYSTOOLS.SAMPLE(JOB_NAME => '{jobName}'[jobEndMaximum:, JOB_END_MAXIMUM => {jobEndMaximum}], ITERATION_COUNT => {iterationCount})"
  };
  const blank = fillTemplate(template, { jobName: 'A' });
  assert.equal(blank, "CALL SYSTOOLS.SAMPLE(JOB_NAME => 'A', ITERATION_COUNT => 100)");

  const filled = fillTemplate(template, { jobName: 'A', jobEndMaximum: '2000' });
  assert.equal(filled, "CALL SYSTOOLS.SAMPLE(JOB_NAME => 'A', JOB_END_MAXIMUM => 2000, ITERATION_COUNT => 100)");
});

test('formatSql breaks before FROM/WHERE/top-level AND, but keeps nested OR-trick groups intact', () => {
  const sql = "SELECT JOURNAL_NAME, JOURNAL_LIBRARY FROM QSYS2.JOURNAL_INFO WHERE (JOURNAL_LIBRARY = 'MYLIB' OR 'MYLIB' = '') AND (JOURNAL_NAME = '' OR '' = '');";
  const formatted = formatSql(sql);
  assert.equal(
    formatted,
    "SELECT JOURNAL_NAME,\n  JOURNAL_LIBRARY\nFROM QSYS2.JOURNAL_INFO\nWHERE (JOURNAL_LIBRARY = 'MYLIB' OR 'MYLIB' = '')\nAND (JOURNAL_NAME = '' OR '' = '');"
  );
});

test('formatSql breaks named-argument lists inside CALL statements, indented by paren depth', () => {
  const sql = "CALL SYSTOOLS.END_JOBS(JOB_NAME_FILTER => 'A', CURRENT_USER_LIST_FILTER => NULLIF('CLARK', ''), END_OPTION => 'IMMEDIATE')";
  const formatted = formatSql(sql);
  assert.equal(
    formatted,
    "CALL SYSTOOLS.END_JOBS(JOB_NAME_FILTER => 'A',\n    CURRENT_USER_LIST_FILTER => NULLIF('CLARK', ''),\n    END_OPTION => 'IMMEDIATE')"
  );
});

test('formatSql does not break commas inside a type declaration like CAST(x AS DECIMAL(21,0))', () => {
  const sql = "SELECT CAST('1' AS DECIMAL(21,0)) FROM SYSIBM.SYSDUMMY1";
  const formatted = formatSql(sql);
  assert.equal(formatted, "SELECT CAST('1' AS DECIMAL(21,0))\nFROM SYSIBM.SYSDUMMY1");
});

test('formatSql does not break on keywords that appear inside quoted string literals', () => {
  const sql = "SELECT * FROM QSYS2.SAMPLE WHERE NAME = 'AND_TEAM';";
  const formatted = formatSql(sql);
  assert.equal(formatted, "SELECT *\nFROM QSYS2.SAMPLE\nWHERE NAME = 'AND_TEAM';");
});

test('formatSql leaves a query with no WHERE clause on minimal lines', () => {
  const sql = 'SELECT TOTAL_JOBS_IN_SYSTEM, CONFIGURED_CPUS FROM QSYS2.SYSTEM_STATUS_INFO;';
  const formatted = formatSql(sql);
  assert.equal(formatted, 'SELECT TOTAL_JOBS_IN_SYSTEM,\n  CONFIGURED_CPUS\nFROM QSYS2.SYSTEM_STATUS_INFO;');
});

// 迴歸測試：曾經發生過 asp_check 的 aspNumber 欄位直接比對數值欄位（未用CHAR()轉字串），
// 導致留空時產生 `ASP_NUMBER =  OR '' = ''` 這種缺右運算元的無效SQL。
// 這裡對 templates.json 全部模板跑一次「必填帶假值、其餘全部留空」，
// 確保往後新增/修改的每個模板都不會重蹈覆轍。
test('every template in templates.json produces valid operands when optional params are left blank', () => {
  const templates = require('../../src/data/templates.json');
  const emptyOperandPattern = /[=<>]\s*(OR|AND|;|$)/i;
  const offenders = [];
  templates.forEach((template) => {
    const paramValues = {};
    (template.params || []).forEach((param) => {
      paramValues[param.name] = param.required ? 'DUMMYVAL' : '';
    });
    const sql = `${fillTemplate(template, paramValues)};`;
    if (emptyOperandPattern.test(sql)) {
      offenders.push({ id: template.id, sql });
    }
  });
  assert.deepEqual(offenders, []);
});
