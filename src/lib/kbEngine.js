(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KBEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- catalog (services.json) ----

  function search(catalog, keyword) {
    const needle = String(keyword || '').toLowerCase();
    if (!needle) return catalog.services;
    return catalog.services.filter((service) => {
      const haystack = [service.id, service.name, service.category, service.description]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  function getById(catalog, id) {
    return catalog.services.find((service) => service.id === id) || null;
  }

  function listByCategory(catalog, category) {
    if (!category) return catalog.services;
    return catalog.services.filter((service) => service.category === category);
  }

  // ---- templates (templates.json) ----

  function matchByKeyword(templates, inputText) {
    const text = String(inputText || '').toLowerCase();
    if (!text) return [];
    return templates.filter((template) =>
      (template.matchKeywords || []).some((kw) => text.includes(String(kw).toLowerCase()))
    );
  }

  function extractParams(template, inputText) {
    const result = {};
    const extract = template.extract;
    if (!extract || !extract.pattern) return result;
    const regex = new RegExp(extract.pattern);
    const match = String(inputText || '').match(regex);
    if (!match) return result;
    (extract.groups || []).forEach((groupName, index) => {
      if (match[index + 1] !== undefined) {
        result[groupName] = match[index + 1];
      }
    });
    return result;
  }

  function getMissingParams(template, paramValues) {
    return (template.params || []).filter((param) => {
      const hasValue = paramValues[param.name] !== undefined && paramValues[param.name] !== '';
      const hasDefault = param.default !== undefined;
      return param.required && !hasValue && !hasDefault;
    });
  }

  // 條件式子句省略：sqlTemplate裡[paramName:文字]這個區塊，該參數留空(未定義或空字串，
  // 不看default)時整段(含中括號)消失；有值時拿掉中括號、內部的{paramName}留給後面的逐參數
  // 替換處理。用於CALL陳述式裡「留空必須整段不出現、傳NULL會被資料庫拒絕」的參數。
  function stripConditionalClauses(sql, paramValues) {
    return sql.replace(/\[([A-Za-z0-9_]+):((?:[^[\]])*)\]/g, function (match, name, inner) {
      const raw = paramValues[name];
      const hasValue = raw !== undefined && raw !== '';
      return hasValue ? inner : '';
    });
  }

  function fillTemplate(template, paramValues) {
    let sql = stripConditionalClauses(template.sqlTemplate, paramValues);
    (template.params || []).forEach((param) => {
      const raw = paramValues[param.name];
      let value = raw !== undefined && raw !== '' ? raw : param.default !== undefined ? param.default : '';
      if (param.upper) value = String(value).toUpperCase();
      sql = sql.split(`{${param.name}}`).join(value);
    });
    return sql;
  }

  // ---- SQL 格式化 ----
  // 在 FROM/WHERE/AND/OR/ORDER BY/GROUP BY 關鍵字前與頂層逗號後插入換行，
  // 用括號深度(depth)跳過巢狀條件(OR trick)內的內容、用 inQuote 跳過字串常值內容，
  // 避免把 (COL = '{x}' OR '{x}' = '') 這種寫法拆得太碎，也避免誤判字串裡剛好包含關鍵字的情況。
  // depth>=1的逗號，只有後面緊接著「NAME => 」具名參數寫法時才換行(縮排依深度遞增)，
  // 這樣CALL陳述式/TABLE函式呼叫的具名參數列表才能多行呈現，同時不會誤傷CAST(x AS
  // DECIMAL(21,0))這種型別宣告或SUBSTR(x,1,5)這種簡短位置參數呼叫裡的逗號。
  const SQL_BREAK_WORDS = ['ORDER BY', 'GROUP BY', 'FROM', 'WHERE', 'AND', 'OR'];
  const NAMED_ARG_AFTER_COMMA = /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=>/;

  function formatSql(sql) {
    let out = '';
    let depth = 0;
    let inQuote = false;
    let i = 0;
    while (i < sql.length) {
      const ch = sql[i];
      if (inQuote) {
        out += ch;
        if (ch === "'") inQuote = false;
        i += 1;
        continue;
      }
      if (ch === "'") {
        inQuote = true;
        out += ch;
        i += 1;
        continue;
      }
      if (ch === '(') {
        depth += 1;
        out += ch;
        i += 1;
        continue;
      }
      if (ch === ')') {
        depth -= 1;
        out += ch;
        i += 1;
        continue;
      }
      if (ch === ',' && (depth === 0 || NAMED_ARG_AFTER_COMMA.test(sql.slice(i + 1)))) {
        out = out.replace(/[ \t]+$/, '');
        const indent = depth === 0 ? '  ' : '  '.repeat(depth + 1);
        out += ',\n' + indent;
        i += 1;
        while (sql[i] === ' ') i += 1;
        continue;
      }
      if (depth === 0) {
        const matched = SQL_BREAK_WORDS.find((kw) => {
          if (sql.substr(i, kw.length).toUpperCase() !== kw) return false;
          const before = i === 0 ? ' ' : sql[i - 1];
          const after = sql[i + kw.length] || ' ';
          return /[\s(]/.test(before) && /[\s)]/.test(after);
        });
        if (matched) {
          out = out.replace(/[ \t]+$/, '');
          out += `\n${matched}`;
          i += matched.length;
          continue;
        }
      }
      out += ch;
      i += 1;
    }
    return out;
  }

  return {
    search,
    getById,
    listByCategory,
    matchByKeyword,
    extractParams,
    getMissingParams,
    fillTemplate,
    formatSql
  };
});
