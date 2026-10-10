# Değirmenköy

Her sakini ayrı bir Haiku ajanı olan küçük bir Türk kasabası. Opus anlatıcı dünyayı yönetir, olay çıkarır ve 27 yıllık
bir sırrı tutar. Kasaba tarayıcıda, Westworld kontrol odası gibi bir gözetim ekranından canlı izlenir.

- **Anlatıcı (Opus):** `.claude/skills/kasaba/SKILL.md`, Claude Code'da `/kasaba` ile çalışır.
- **Sakin (Haiku):** `.claude/agents/sakin.md`. Her tur altı sakin paralel çağrılır; her biri yalnız kendi paketini okur,
  kendi cevabını yazar.
- **Motor:** `scripts/tur.mjs` (sifirla, hazirla, uygula, ozet). Dünya `dunya/` klasöründe.
- **Kontrol odası:** `node scripts/sunucu.mjs`, sonra http://127.0.0.1:4330

## Çalıştırma

```
cd ~/Vibe-Code/kasaba
node scripts/sunucu.mjs &      # kontrol odası
claude                          # Opus ile
> /kasaba gun                   # bir gün: 7 tur × 6 Haiku
```
