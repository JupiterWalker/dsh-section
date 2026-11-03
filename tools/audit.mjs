/**
 * Static audit of client.js: style keys and dictionary keys must stay in sync.
 * Dictionary keys are matched inside the inline EN/ZH literals, not locale/*.json
 * (those files only carry meta.title / meta.description for the Plugins page).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'client.js'), 'utf8');

function sliceFrom(marker) {
	const start = source.indexOf(marker);
	if (start === -1) throw new Error(`missing ${marker}`);
	const end = source.indexOf('\n\t\t};', start);
	return source.slice(start, end);
}

const styleBody = sliceFrom('const S = {');
const definedStyles = new Set([...styleBody.matchAll(/^\t\t\t([A-Za-z0-9_]+):/gm)].map((match) => match[1]));
const usedStyles = new Set([...source.matchAll(/\bS\.([A-Za-z0-9_]+)/g)].map((match) => match[1]));
const missingStyles = [...usedStyles].filter((key) => !definedStyles.has(key));
const unusedStyles = [...definedStyles].filter((key) => !usedStyles.has(key));

function dictKeys(marker) {
	return [...sliceFrom(marker).matchAll(/\t\t\t'([^']+)':/g)].map((match) => match[1]);
}

const en = dictKeys('const EN = {');
const zh = dictKeys('const ZH = {');
const usedKeys = new Set([...source.matchAll(/\bt\('([^']+)'\)/g)].map((match) => match[1]));
const missingEn = [...usedKeys].filter((key) => !en.includes(key));
const missingZh = [...usedKeys].filter((key) => !zh.includes(key));
const enOnly = en.filter((key) => !zh.includes(key));
const zhOnly = zh.filter((key) => !en.includes(key));
const unusedKeys = en.filter((key) => !usedKeys.has(key));

const report = {
	styles: { defined: definedStyles.size, used: usedStyles.size, missing: missingStyles, unused: unusedStyles },
	dictionary: {
		en: en.length,
		zh: zh.length,
		missingEn,
		missingZh,
		enOnly,
		zhOnly,
		unused: unusedKeys,
	},
};

console.log(JSON.stringify(report, null, 2));
const clean =
	missingStyles.length === 0 &&
	unusedStyles.length === 0 &&
	missingEn.length === 0 &&
	missingZh.length === 0 &&
	enOnly.length === 0 &&
	zhOnly.length === 0 &&
	unusedKeys.length === 0;
console.log(clean ? 'AUDIT PASS' : 'AUDIT FAIL');
process.exit(clean ? 0 : 1);
