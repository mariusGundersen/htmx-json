import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import uglify from 'uglify-js';

await mkdir('./dist', { recursive: true });
await copyFile('./src/htmx-json.js', './dist/htmx-json.js');
const file = await readFile('./src/htmx-json.js', 'utf-8');
const { code } = uglify.minify(file);
await writeFile('./dist/htmx-json.min.js', code);