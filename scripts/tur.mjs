#!/usr/bin/env node
// Kasabanın tur motoru. Anlatıcı (Opus) bu betiği çağırır; sakinler (Haiku) yalnız kendi paketini okur, kendi cevabını yazar.
//   node scripts/tur.mjs sifirla
//   node scripts/tur.mjs hazirla [--olay "metin" --yer <mekan|herkes>]
//   node scripts/tur.mjs uygula
//   node scripts/tur.mjs ozet
import { readFileSync, writeFileSync, appendFileSync, readdirSync, rmSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const D = (...p) => path.join(KOK, "dunya", ...p);
const DURUM = D("kasaba.json");
const AKIS = D("akis.jsonl");
const OLCUM = D("olcum.jsonl");
const TUR_SAATLERI = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

const oku = () => JSON.parse(readFileSync(DURUM, "utf8"));
const yaz = (s) => writeFileSync(DURUM, JSON.stringify(s, null, 2));
const akisa = (k) => appendFileSync(AKIS, JSON.stringify({ zaman: Date.now(), ...k }) + "\n");
const akisOku = () => (existsSync(AKIS) ? readFileSync(AKIS, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
// Bir sakinin son turlarda nerede ne yaptığı (en yeni sonda) ve kaç turdur aynı yerde olduğu.
// Aynı yerde kalma sayacı yalnız o günün turlarını sayar; gece bir sonraki güne taşınmaz.
function gecmis(akis, id, gun, n = 3) {
  const eylemler = akis.filter((e) => e.tip === "eylem" && e.kim === id);
  const bugun = eylemler.filter((e) => e.gun === gun);
  let ayni = 0;
  for (let i = bugun.length - 1; i >= 0 && bugun[i].yer === bugun[bugun.length - 1].yer; i--) ayni++;
  return { son: eylemler.slice(-n), ayni };
}
const temizle = (dir) => { rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true }); };

function arg(ad) {
  const i = process.argv.indexOf(`--${ad}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function sifirla() {
  copyFileSync(D("baslangic", "kasaba.json"), DURUM);
  for (const f of readdirSync(D("baslangic"))) if (f.endsWith(".md")) copyFileSync(D("baslangic", f), D("sakinler", f));
  writeFileSync(AKIS, "");
  writeFileSync(OLCUM, "");
  temizle(D("paketler"));
  temizle(D("cevaplar"));
  console.log("Kasaba sıfırlandı: Gün 1, 08:00.");
}

function hazirla() {
  const s = oku();
  const olay = arg("olay");
  const olayYer = arg("yer") || "herkes";
  if (olay) {
    if (olayYer !== "herkes" && !s.mekanlar[olayYer]) throw new Error(`Bilinmeyen mekan: ${olayYer}`);
    akisa({ gun: s.gun, saat: s.saat, tur: s.tur + 1, tip: "anlatici", yer: olayYer, metin: olay });
  }
  const akis = akisOku();
  const sonTur = akis.filter((k) => k.tur === s.tur && k.gun === s.gun);
  const buTurOlay = akis.filter((k) => k.tip === "anlatici" && k.gun === s.gun && k.tur === s.tur + 1);
  const mekanListesi = Object.entries(s.mekanlar).map(([id, m]) => `${id} (${m.ad})`).join(", ");

  temizle(D("cevaplar"));
  mkdirSync(D("paketler"), { recursive: true });
  for (const [id, k] of Object.entries(s.sakinler)) {
    const kimlik = readFileSync(D("sakinler", `${id}.md`), "utf8");
    const yanindakiler = Object.entries(s.sakinler).filter(([o, ok]) => o !== id && ok.yer === k.yer)
      .map(([o, ok]) => `- ${ok.unvan} ${ok.ad} (${o}): ${ok.eylem}`);
    const duydugu = sonTur.filter((e) => e.tip === "soz" && e.kim !== id && (e.yer === k.yer || e.kime === id) && e.duyanlar?.includes(id))
      .map((e) => `- ${s.sakinler[e.kim].ad}${e.kime && e.kime !== "herkes" ? ` (${s.sakinler[e.kime]?.ad ?? e.kime} için)` : ""}: "${e.metin}"`);
    const gordugu = buTurOlay.filter((e) => e.yer === "herkes" || e.yer === k.yer).map((e) => `- ${e.metin}`);
    const { son, ayni } = gecmis(akis, id, s.gun);
    const gecmisMetni = son.map((e) => `- Gün ${e.gun} ${e.saat}, ${s.mekanlar[e.yer]?.ad ?? e.yer}: ${e.metin}`).join("\n");
    const tekrarUyari = ayni >= 3 ? `\nBugün ${ayni} turdur (${ayni * 2} saattir) aynı yerdesin. İşin buradaysa doğal olabilir; değilse ya da hep aynı şeyi yapıyorsan başka bir şey yapmayı düşün.` : "";
    const digerleri = Object.entries(s.sakinler).filter(([o]) => o !== id)
      .map(([o, ok]) => `${o} = ${ok.unvan} ${ok.ad} (güvenin ${k.guven[o] ?? 50}/100)`).join("; ");

    const paket = `${kimlik.trim()}

## Şu an
Gün ${s.gun}, saat ${s.saat}. Kasaba: ${s.ad}. Bulunduğun yer: ${s.mekanlar[k.yer].ad} (${k.yer}).
Ruh halin: ${k.ruh}. Son yaptığın: ${k.eylem}

## Son turlarda ne yaptın
${gecmisMetni || "- Gün yeni başladı."}${tekrarUyari}

## Yanındakiler
${yanindakiler.join("\n") || "- Kimse yok, yalnızsın."}

## Son iki saatte duydukların
${duydugu.join("\n") || "- Kayda değer bir şey duymadın."}

## Şu an gözüne çarpan
${gordugu.join("\n") || "- Olağan bir an."}

## Kasabadakiler
${digerleri}

## Gidebileceğin yerler
${mekanListesi}
`;
    writeFileSync(D("paketler", `${id}.md`), paket);
  }
  s.durum = "dusunuyor";
  s._tur_baslangic = Date.now();
  yaz(s);
  console.log(`Tur ${s.tur + 1} hazır (Gün ${s.gun} ${s.saat}). Paketler: ${Object.keys(s.sakinler).map((i) => `dunya/paketler/${i}.md`).join(", ")}`);
}

function uygula() {
  const s = oku();
  const tur = s.tur + 1;
  const eksik = [];
  const cevaplar = {};
  for (const id of Object.keys(s.sakinler)) {
    const f = D("cevaplar", `${id}.json`);
    try {
      const ham = readFileSync(f, "utf8").replace(/^```(json)?\s*|\s*```$/g, "");
      cevaplar[id] = JSON.parse(ham);
    } catch { eksik.push(id); }
  }
  // Önce herkes yerini alır, sonra sözler aynı yerdekilere duyulur.
  for (const [id, c] of Object.entries(cevaplar)) {
    const k = s.sakinler[id];
    if (c.yer && s.mekanlar[c.yer]) k.yer = c.yer;
    k.ruh = c.ruh || k.ruh;
    k.eylem = c.eylem || k.eylem;
    k.ic_ses = c.ic_ses || "";
    k.soz = c.soz?.metin ? { kime: c.soz.kime || "herkes", metin: c.soz.metin } : null;
    for (const [o, d] of Object.entries(c.guven || {})) {
      if (o in k.guven) k.guven[o] = Math.max(0, Math.min(100, (k.guven[o] ?? 50) + Math.max(-20, Math.min(20, Number(d) || 0))));
    }
  }
  for (const [id, c] of Object.entries(cevaplar)) {
    const k = s.sakinler[id];
    const ortak = { gun: s.gun, saat: s.saat, tur, kim: id, yer: k.yer };
    akisa({ ...ortak, tip: "eylem", metin: k.eylem });
    if (k.soz) {
      const duyanlar = Object.entries(s.sakinler).filter(([o, ok]) => o !== id && ok.yer === k.yer).map(([o]) => o);
      // Herkes aynı anda hareket ettiği için seslenilen kişi o sırada başka yere gitmiş olabilir: söz ona ulaşmaz.
      const hedef = s.sakinler[k.soz.kime];
      const ulasmadi = !!hedef && hedef.yer !== k.yer;
      akisa({ ...ortak, tip: "soz", kime: k.soz.kime, metin: k.soz.metin, duyanlar, ...(ulasmadi && { ulasmadi: true }) });
      if (ulasmadi) {
        appendFileSync(D("sakinler", `${id}.md`), `- Gün ${s.gun} ${s.saat}: Seslendiğin ${hedef.ad} o sırada ${s.mekanlar[hedef.yer].ad} tarafındaydı, söylediğini duymadı.\n`);
        k.soz = { ...k.soz, ulasmadi: true };
      }
    }
    if (k.ic_ses) akisa({ ...ortak, tip: "ic_ses", metin: k.ic_ses });
    if (c.hafiza) appendFileSync(D("sakinler", `${id}.md`), `- Gün ${s.gun} ${s.saat}, ${s.mekanlar[k.yer].ad}: ${c.hafiza}\n`);
  }
  const sure = s._tur_baslangic ? Math.round((Date.now() - s._tur_baslangic) / 1000) : null;
  appendFileSync(OLCUM, JSON.stringify({ gun: s.gun, saat: s.saat, tur, sure_sn: sure, cevap: Object.keys(cevaplar).length, eksik }) + "\n");

  s.tur = tur;
  const i = TUR_SAATLERI.indexOf(s.saat);
  if (i === TUR_SAATLERI.length - 1) { s.durum = "gun_bitti"; s.gun += 1; s.saat = TUR_SAATLERI[0]; }
  else { s.durum = "bekliyor"; s.saat = TUR_SAATLERI[i + 1]; }
  delete s._tur_baslangic;
  yaz(s);
  console.log(`Tur ${tur} uygulandı (${sure ?? "?"} sn).${eksik.length ? ` Cevap gelmeyen: ${eksik.join(", ")}.` : ""}`);
  ozet();
}

function ozet() {
  const s = oku();
  const akis = akisOku();
  const bugunOlay = akis.filter((k) => k.tip === "anlatici" && k.gun === s.gun).length;
  console.log(`\nGün ${s.gun}, sıradaki saat ${s.saat} (durum: ${s.durum}). Bugünkü anlatıcı olayı: ${bugunOlay}/3.`);
  const takilan = Object.keys(s.sakinler).map((id) => [id, gecmis(akis, id, s.gun).ayni]).filter(([, n]) => n >= 3);
  if (takilan.length) console.log(`Takılanlar (3+ turdur aynı yerde): ${takilan.map(([id, n]) => `${s.sakinler[id].ad} ${n} tur`).join(", ")}`);
  for (const [id, k] of Object.entries(s.sakinler)) {
    console.log(`- ${k.ad} @${k.yer} [${k.ruh}] ${k.eylem}${k.soz ? ` | "${k.soz.metin}"` : ""}${k.ic_ses ? ` | iç ses: ${k.ic_ses}` : ""}`);
  }
}

const komut = process.argv[2];
({ sifirla, hazirla, uygula, ozet }[komut] ?? (() => { console.log("Komut: sifirla | hazirla | uygula | ozet"); process.exit(1); }))();
