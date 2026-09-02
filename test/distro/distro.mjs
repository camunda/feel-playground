import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { init, parse } from 'es-module-lexer';

test('should expose the public JavaScript API', async () => {

  // when
  const entryPath = fileURLToPath(
    import.meta.resolve('@camunda/feel-playground')
  );
  const source = await readFile(entryPath, 'utf8');
  await init;
  const [, exports] = parse(source);
  const names = exports.map(exported => exported.n).sort();

  // then
  assert.deepEqual(names, [ 'FeelPlayground' ]);
});


test('should expose the playground stylesheet', async () => {

  // when
  const stylesheetPath = fileURLToPath(
    import.meta.resolve('@camunda/feel-playground/style.css')
  );
  await access(stylesheetPath);
  const stylesheet = await readFile(stylesheetPath, 'utf8');

  // then
  assert.match(stylesheet, /\.feel-playground/);
});


test('should include public artifacts in the package', () => {

  // when
  const [{ files }] = JSON.parse(execFileSync(
    'npm',
    [ 'pack', '--dry-run', '--ignore-scripts', '--json' ],
    { encoding: 'utf8' }
  ));
  const paths = files.map(file => file.path);
  const missing = [
    'dist/index.js',
    'dist/index.d.ts',
    'dist/style.css'
  ].filter(path => !paths.includes(path));

  // then
  assert.deepEqual(missing, []);
});