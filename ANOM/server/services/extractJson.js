'use strict';

function extractJson(text) {
  const source = String(text || '');
  const start = source.indexOf('{');
  if (start === -1) throw new Error('AI response could not be parsed.');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') { inString = true; continue; }
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth === 0) {
      try {
        return JSON.parse(source.substring(start, index + 1));
      } catch (_error) {
        throw new Error('AI response could not be parsed.');
      }
    }
  }
  throw new Error('AI response could not be parsed.');
}

module.exports = { extractJson };
