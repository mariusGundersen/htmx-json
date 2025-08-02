import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import uglify from "uglify-js";

await mkdir("./dist", { recursive: true });
await copyFile("./src/htmx-json.js", "./dist/htmx-json.js");
const file = await readFile("./src/htmx-json.js", "utf-8");
const { code } = uglify.minify(file, {
  compress: {
    global_defs: {
      HTMX_JSON_DEBUG: false,
    },
  },
});
await writeFile("./dist/htmx-json.min.js", code);
await writeFile("./dist/htmx-json.mjs", `${file}\nexport default htmxJson;`);
await writeFile("./dist/htmx-json.cjs", `${file}\module.exports htmxJson;`);
