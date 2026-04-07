import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const LIMIT = 20000;

// ⚠️ Remplace par ta clé
const GEMINI_API_KEY = "AIzaSyANsg6IE8gPYXSyTrHJKtenUTgMMqzvjuo";

// Choix du modèle (rapide et pas cher)
const GEMINI_MODEL = "gemini-1.5-flash";

// URL API Gemini (Generative Language API)
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function clampText(t) {
  if (!t) return "";
  return t.length > LIMIT ? t.slice(0, LIMIT) : t;
}

// ✅ Résumé local (fallback) : scoring de phrases
function summarizeSemantic(text, length) {
  const stopWords = new Set([
    "le","la","les","un","une","des","de","du","et","en","à","a","au","aux",
    "est","sont","pour","avec","sur","dans","ce","ces","qui","que","quoi",
    "dont","mais","plus","moins","par","pas","ne","se","sa","son","ses",
    "leur","leurs","elle","il","ils","elles","on","nous","vous","tu","je",
    "d","l","y","c","ça"
  ]);

  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25);

  if (sentences.length <= 1) return cleaned;

  // 1) fréquences des mots importants
  const freq = {};
  cleaned
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .split(/\s+/)
    .forEach(w => {
      const word = w.replace(/^['-]+|['-]+$/g, "");
      if (!word) return;
      if (stopWords.has(word)) return;
      if (word.length <= 3) return;
      freq[word] = (freq[word] || 0) + 1;
    });

  // 2) score des phrases
  const scored = sentences.map((s, idx) => {
    const words = s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s'-]/gu, "")
      .split(/\s+/);

    const score = words.reduce((sum, w) => {
      const word = w.replace(/^['-]+|['-]+$/g, "");
      return sum + (freq[word] || 0);
    }, 0);

    const positionBoost = idx === 0 ? 1.2 : idx === 1 ? 1.1 : 1.0;
    return { s, score: score * positionBoost, idx };
  });

  scored.sort((a, b) => b.score - a.score);

  const n = length === "short" ? 1 : length === "medium" ? 2 : 3;
  const pick = scored.slice(0, n).sort((a, b) => a.idx - b.idx).map(x => x.s);

  return pick.join(" ").trim();
}

function lengthToFrenchLabel(length) {
  if (length === "short") return "très court (1-2 phrases)";
  if (length === "medium") return "court (2-4 phrases)";
  return "un peu plus long (4-7 phrases)";
}

async function summarizeWithGemini(text, length) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("Missing GEMINI API KEY");
  }

  // Prompt clair pour éviter que Gemini réécrive n’importe comment
  const prompt = `
Tu es un assistant de résumé.
Résume le texte suivant en FRANÇAIS.
Longueur souhaitée: ${lengthToFrenchLabel(length)}.
Contraintes:
- Pas de titre
- Pas de puces
- Un seul paragraphe
- Garde les infos importantes (qui, quoi, quand, où)
Texte:
${text}
`.trim();

  const res = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: length === "short" ? 120 : length === "medium" ? 220 : 360
      }
    })
  });

  const data = await res.json();

  // Si erreur API
  if (!res.ok) {
    const msg = data?.error?.message || "Gemini API error";
    throw new Error(msg);
  }

  const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return String(out || "").trim();
}

export default function App() {
  const [mode, setMode] = useState("paste"); // paste | tab
  const [length, setLength] = useState("short"); // short | medium | long

  const [dark, setDark] = useState(false);
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  // affichage “IA utilisée”
  const [aiUsed, setAiUsed] = useState("Gemini (cloud)");

  const safeText = useMemo(() => clampText(text), [text]);
  const wordCount = useMemo(
    () => (safeText.trim() ? safeText.trim().split(/\s+/).length : 0),
    [safeText]
  );

  // restore dark
  useEffect(() => {
    chrome.storage.local.get(["dark"], (res) => {
      if (typeof res.dark === "boolean") setDark(res.dark);
    });
  }, []);

  // apply dark
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    chrome.storage.local.set({ dark });
  }, [dark]);

  async function handleGetTabText() {
    setLoading(true);
    setSummary("");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const resp = await chrome.runtime.sendMessage({
        action: "getPageText",
        tabId: tab?.id
      });
      const t = (resp?.text || "").trim();
      setText(clampText(t));
      setSummary(t ? "Texte récupéré ✅ Clique sur Résumer." : "Impossible de récupérer le texte.");
    } catch {
      setSummary("Erreur récupération onglet.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    const t = safeText.trim();
    if (!t) {
      setSummary("Colle un texte d’abord 🙂");
      return;
    }

    setLoading(true);
    setSummary("");

    // 1) On tente Gemini
    try {
      const s = await summarizeWithGemini(t, length);
      setAiUsed("Gemini (cloud)");
      setSummary(s || "Aucun résumé retourné par Gemini.");
      return;
    } catch (e) {
      console.log("Gemini KO -> fallback local:", e?.message || e);
    }

    // 2) Fallback local
    setAiUsed("Local (fallback)");
    setSummary(summarizeSemantic(t, length));
    setLoading(false);
  }

  async function handleCopy() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
  }

  function handleReset() {
    setText("");
    setSummary("");
  }

  return (
    <div className={`container ${loading ? "loading" : ""}`}>
      <div className="header">
        <div>
          <div className="title">Résumé IA</div>
          <div className="small" style={{ marginTop: 2 }}>
            IA utilisée : <b>{aiUsed}</b>
          </div>
        </div>

        <label className="toggle">
          🌙
          <input
            type="checkbox"
            checked={dark}
            onChange={(e) => setDark(e.target.checked)}
          />
        </label>
      </div>

      <div className="row">
        <button
          className={mode === "paste" ? "btn-primary" : "btn-ghost"}
          onClick={() => setMode("paste")}
        >
          Copier/Coller
        </button>
        <button
          className={mode === "tab" ? "btn-primary" : "btn-ghost"}
          onClick={() => setMode("tab")}
        >
          Onglet actif
        </button>
      </div>

      <div className="row2">
        <span className="small" style={{ marginTop: 0 }}>Longueur</span>
        <select value={length} onChange={(e) => setLength(e.target.value)}>
          <option value="short">Très court</option>
          <option value="medium">Court</option>
          <option value="long">Un peu plus</option>
        </select>
      </div>

      {mode === "tab" && (
        <div className="row">
          <button className="btn-ghost" onClick={handleGetTabText}>
            Récupérer le texte de la page
          </button>
        </div>
      )}

      <textarea
        placeholder="Colle ton texte ici…"
        value={safeText}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="row">
        <button className="btn-primary" onClick={handleSummarize}>
          {loading ? "Résumé..." : "Résumer"}
        </button>
        <button className="btn-ghost" onClick={handleCopy} disabled={!summary}>
          Copier
        </button>
        <button className="btn-ghost" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="summary">
        {summary || "Le résumé apparaîtra ici."}
      </div>

      <div className="small">
        Mots collés : {wordCount} — Limite : {LIMIT.toLocaleString("fr-FR")} caractères
      </div>
    </div>
  );
}