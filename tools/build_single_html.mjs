import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "index.html");
const outputPath = path.join(root, "novelx-single.html");

const mimeTypes = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const dataUriCache = new Map();

async function toDataUri(relativePath) {
  const normalizedPath = relativePath.replace(/^\.\//, "");
  if (dataUriCache.has(normalizedPath)) return dataUriCache.get(normalizedPath);

  const filePath = path.join(root, normalizedPath);
  const mimeType = mimeTypes[path.extname(filePath).toLowerCase()];
  if (!mimeType) throw new Error(`Unsupported embedded asset type: ${relativePath}`);

  const dataUri = `data:${mimeType};base64,${(await readFile(filePath)).toString("base64")}`;
  dataUriCache.set(normalizedPath, dataUri);
  return dataUri;
}

async function replaceAsync(source, pattern, replacer) {
  const matches = [...source.matchAll(pattern)];
  if (!matches.length) return source;

  const replacements = await Promise.all(matches.map((match) => replacer(...match)));
  let cursor = 0;
  let result = "";

  matches.forEach((match, index) => {
    result += source.slice(cursor, match.index) + replacements[index];
    cursor = match.index + match[0].length;
  });

  return result + source.slice(cursor);
}

async function inlineStyles(html) {
  let css = await readFile(path.join(root, "styles.css"), "utf8");
  css = await replaceAsync(css, /url\((['"]?)(\.\/[^)'"#]+)\1\)/g, async (_match, _quote, assetPath) => {
    return `url("${await toDataUri(assetPath)}")`;
  });
  css = css.replace(/<\/style/gi, "<\\/style");

  return html.replace(
    /\s*<link rel="stylesheet" href="\.\/styles\.css" \/>/,
    `\n    <style>\n${css}\n    </style>`,
  );
}

async function inlineImages(html) {
  return replaceAsync(html, /\bsrc="(\.\/assets\/[^"?]+)"/g, async (_match, assetPath) => {
    return `src="${await toDataUri(assetPath)}"`;
  });
}

async function inlineScripts(html) {
  return replaceAsync(
    html,
    /<script src="(\.\/(?:assets|vendor)\/[^"?]+|\.\/script\.js)"><\/script>/g,
    async (_match, scriptPath) => {
      const source = await readFile(path.join(root, scriptPath.replace(/^\.\//, "")), "utf8");
      return `<script>\n${source.replace(/<\/script/gi, "<\\/script")}\n    </script>`;
    },
  );
}

let html = await readFile(inputPath, "utf8");
html = html.replace(/\n\s*<link rel="preload"[^>]+>/g, "");
html = html.replace(
  /href="\.\/assets\/novelx-favicon\.png"/,
  `href="${await toDataUri("./assets/novelx-favicon.png")}"`,
);
html = html.replace('href="./index.html"', 'href="#opening"');
html = await inlineStyles(html);
html = await inlineScripts(html);
html = await inlineImages(html);

const unresolvedReferences = [
  "./assets/",
  "./fonts/",
  "./vendor/",
  "./styles.css",
  "./script.js",
].filter((reference) => html.includes(reference));

if (unresolvedReferences.length) {
  throw new Error(`Unresolved local references: ${unresolvedReferences.join(", ")}`);
}

await writeFile(outputPath, html);
console.log(`${path.basename(outputPath)} ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB`);
