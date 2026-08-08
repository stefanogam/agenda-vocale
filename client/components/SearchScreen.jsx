// client/components/SearchScreen.jsx
import { useState, useEffect } from "react";
import { ArrowLeft, Search, X, Star } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import * as store from "../lib/store.js";
import { shortDate, parseKey } from "../lib/date-utils.js";

function highlight(text, query) {
  if (!query.trim()) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: tokens.amber, fontWeight: 600 }}>{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

export default function SearchScreen({ onBack, catColor, catIcon, onOpen }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => setResults(await store.searchItems(q)), 200); // piccolo debounce
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="px-6 pt-9 pb-4 flex flex-col" style={{ height: "100%" }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} aria-label="Indietro" className="rounded-full p-2 shrink-0" style={{ background: tokens.surface }}><ArrowLeft size={16} color={tokens.textPrimary} /></button>
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}>
          <Search size={15} color={tokens.textSecondary} />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca appuntamenti, scadenze, radar…" className="flex-1 bg-transparent outline-none text-sm f-body" style={{ color: tokens.textPrimary }} />
          {query && <button onClick={() => setQuery("")} aria-label="Cancella ricerca"><X size={14} color={tokens.textSecondary} /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!query.trim() && <p className="text-xs text-center py-10" style={{ color: tokens.textSecondary }}>Cerca per titolo o note</p>}
        {query.trim() && results.length === 0 && <p className="text-xs text-center py-10" style={{ color: tokens.textSecondary }}>Nessun risultato per "{query}"</p>}

        <div className="flex flex-col gap-2">
          {results.map((item) => {
            const Icon = catIcon(item.category) || Star;
            return (
              <button key={item.id} onClick={() => onOpen(item)} className="rounded-2xl px-4 py-3 flex items-center gap-3 text-left w-full" style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}>
                <div className="rounded-full p-2 shrink-0" style={{ background: `${catColor(item.category)}22` }}><Icon size={13} color={catColor(item.category)} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: tokens.textPrimary }}>{highlight(item.title, query)}</p>
                  <p className="text-xs mt-0.5" style={{ color: tokens.textSecondary }}>
                    {item.type === "radar" ? "Radar" : item.date ? shortDate(parseKey(item.date)) : ""} · {item.category}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
