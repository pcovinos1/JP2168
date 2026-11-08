import { createHash } from "node:crypto";
import { readdir, stat, writeFile, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const distDir = "dist";
const ignored = new Set(["offline-cache-manifest.json"]);

async function walk(dir) {
  const entries = (await readdir(dir)).sort();
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (!ignored.has(entry)) {
      files.push(path);
    }
  }
  return files;
}

const files = await walk(distDir);
const hash = createHash("sha256");
for (const file of files) {
  if (file.endsWith("/sw.js")) continue;
  hash.update(relative(distDir, file));
  hash.update(await readFile(file));
}
const worker = await readFile("public/sw.js", "utf8");
hash.update(worker);
await writeFile(join(distDir, "sw.js"), worker.replace("__BUILD_REVISION__", hash.digest("hex").slice(0, 16)));

const urls = [
  "./",
  ...files
    .map((file) => relative(distDir, file).split(sep).join("/"))
    .filter((url) => url !== "index.html"),
  "index.html"
];

await writeFile(
  join(distDir, "offline-cache-manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      files: [...new Set(urls)]
    },
    null,
    2
  )
);

console.log(`offline-cache-manifest.json generado con ${urls.length} archivos.`);
