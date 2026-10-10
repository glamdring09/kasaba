#!/usr/bin/env node
// Kontrol odası için küçük yerel sunucu: ekran/ ve dunya/ klasörlerini sunar. Bağımlılık yok.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4330);
const TIP = { ".jpg": "image/jpeg", ".png": "image/png", ".md": "text/plain; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jsonl": "text/plain; charset=utf-8" };
const IZINLI = ["dunya/kasaba.json", "dunya/akis.jsonl", "dunya/olcum.jsonl"];

createServer(async (req, res) => {
  let yol = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
  if (yol === "") yol = "ekran/index.html";
  if (yol.includes("..")) { res.writeHead(400).end(); return; }
  if (!yol.startsWith("ekran/") && !IZINLI.includes(yol) && !/^dunya\/sakinler\/[a-z]+\.md$/.test(yol)) { res.writeHead(404).end(); return; }
  try {
    const veri = await readFile(path.join(KOK, yol));
    res.writeHead(200, { "Content-Type": TIP[path.extname(yol)] || "application/octet-stream", "Cache-Control": "no-store" }).end(veri);
  } catch { res.writeHead(404).end(); }
}).listen(PORT, "127.0.0.1", () => console.log(`Kontrol odası: http://127.0.0.1:${PORT}`));
