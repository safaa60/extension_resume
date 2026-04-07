import React, { useEffect, useMemo, useState } from "react";

const LIMIT = 20000;

function clampText(t) {
  if (!t) return "";
  return t.length > LIMIT ? t.slice(0, LIMIT) : t;
}

// fallback simple (si IA non dispo)
function naiveSummary(text, sentencesCount = 4) {
  const s = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  if (s.length <= sentencesCount) return text.trim();

  const picks = new Set([0, 1, Math.floor(s.length / 2), s.length - 2, s.length - 1]);
  const arr = Array.from(picks)
    .filter((i) => i >= 0 && i < s.length)
    .slice(0, sentencesCount);

  return arr.map((i) => s[i]).join(" ").trim();
}

function hasChromeAI() {
  return Boolean(window?.ai?.summarizer);
}

async function summarizeWithChromeAI(text, length) {
  // length: "short" | "medium" | "long"
  const summarizer = await window.ai.summarizer.create({
    length,
  });
  const result = await summarizer.summarize(text);
  return String(result || "").trim();
}

async function summarizeText(text, length) {
  // IMPORTANT : preuve + logs
  const aiAvailable = hasChromeAI();
  console.log(aiAvailable ? "✅ IA intégrée détectée (window.ai.summarizer)" : "❌ IA intégrée absente -> fallback");

  if (aiAvailable) {
    try {
      const s = await summarizeWithChromeAI(text, length);
      if (s) return s;
      console.log("⚠️ IA intégrée a renvoyé vide -> fallback");
    } catch (e) {
      console.log("❌ Erreur IA intégrée -> fallback", e);
    }
  }

  // fallback
  const n = length === "short" ? 3 : length === "long" ? 6 : 4;
  return naiveSummary(text, n);
}

export default function Popup() {
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState("paste"); // "paste" | "tab"
  const [length, setLength] = useState("medium"); // "short" | "medium" | "long"
  const [dark, setDark] = useState(false);

  // affichage status IA
  const [aiStatus, setAiStatus] = useState("…"); // "ON" | "OFF" | "…"

  const inputSafe = useMemo(() => clampText(input), [input]);

  useEffect(() => {
    // restore dark mode
    chrome.storage.local.get(["dark"], (res) => {
      if (typeof res.dark === "boolean") setDark(res.dark);
    });

    // détecte IA au démarrage
    setAiStatus(hasChromeAI() ? "ON" : "OFF");
  }, []);

  useEffect(() => {
    document.documentElement.style.background = dark ? "#0b0d10" : "white";
    chrome.storage.local.set({ dark });
  }, [dark]);

  async function handleSummarize() {
    const text = inputSafe.trim();
    if (!text) {
      setSummary("Colle un texte d’abord 🙂");
      return;
    }
    setLoading(true);
    setSummary("");
    try {
      // refresh status IA (au cas où)
      setAiStatus(hasChromeAI() ? "ON" : "OFF");

      const s = await summarizeText(text, length);
      setSummary(s || "Aucun résumé généré (texte trop court ?)");
    } finally {
      setLoading(false);
    }
  }

  async function loadFromActiveTab() {
    setLoading(true);
    setSummary("");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const resp = await chrome.runtime.sendMessage({
        action: "getPageText",
        tabId: tab?.id,
      });

      const text = (resp?.text || "").trim();
      setInput(clampText(text));
      setSummary(text ? "Texte récupéré ✅ Tu peux cliquer sur Résumer." : "Impossible de récupérer le texte.");
    } catch (e) {
      setSummary("Erreur lors de la récupération de la page.");
    } finally {
      setLoading(false);
    }
  }

  function speak() {
    if (!summary) return;
    if (!("speechSynthesis" in window)) {
      alert("speechSynthesis non disponible");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(summary);
    u.lang = "fr-FR";
    window.speechSynthesis.speak(u);
  }

  function stopSpeak() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  return (
    <div
      style={{
        width: 360,
        padding: 12,
        color: dark ? "#e8eaed" : "#111",
        background: dark ? "#0b0d10" : "#fff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0 }}>Résumé IA</h3>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
            IA intégrée : <b>{aiStatus}</b>
          </div>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
          <span>🌙</span>
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={() => setMode("paste")} style={{ flex: 1, opacity: mode === "paste" ? 1 : 0.6 }}>
          Copier/Coller
        </button>
        <button onClick={() => setMode("tab")} style={{ flex: 1, opacity: mode === "tab" ? 1 : 0.6 }}>
          Onglet actif (option)
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Longueur:</span>
        <select value={length} onChange={(e) => setLength(e.target.value)} style={{ flex: 1 }}>
          <option value="short">Court</option>
          <option value="medium">Moyen</option>
          <option value="long">Long</option>
        </select>
      </div>

      {mode === "tab" && (
        <button onClick={loadFromActiveTab} disabled={loading} style={{ width: "100%", marginTop: 10 }}>
          {loading ? "Chargement..." : "Récupérer le texte de la page"}
        </button>
      )}

      <textarea
        value={inputSafe}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Colle ton texte ici…"
        style={{
          width: "100%",
          height: 140,
          marginTop: 10,
          resize: "vertical",
          background: dark ? "#11151b" : "#f5f5f5",
          color: dark ? "#e8eaed" : "#111",
          border: "1px solid " + (dark ? "#222a35" : "#ddd"),
          borderRadius: 8,
          padding: 10,
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={handleSummarize} disabled={loading} style={{ flex: 1 }}>
          {loading ? "Résumé..." : "Résumer"}
        </button>
        <button
          onClick={() => {
            setInput("");
            setSummary("");
            stopSpeak();
          }}
          style={{ width: 90 }}
        >
          Reset
        </button>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 8,
          background: dark ? "#0f1318" : "#fafafa",
          border: "1px solid " + (dark ? "#1d2530" : "#eee"),
          minHeight: 80,
          whiteSpace: "pre-wrap",
        }}
      >
        {summary || <span style={{ opacity: 0.7 }}>Le résumé s’affichera ici.</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={speak} disabled={!summary} style={{ flex: 1 }}>
          🔊 Lire
        </button>
        <button onClick={stopSpeak} style={{ flex: 1 }}>
          ⏹ Stop
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.75 }}>
        Limite: {LIMIT.toLocaleString("fr-FR")} caractères (sécurité).
      </div>
    </div>
  );
}