// client/lib/use-swipe.js
import { useRef } from "react";

// Riconosce lo scorrimento orizzontale del dito.
// Destra→sinistra = avanti, sinistra→destra = indietro.
//
// Ignora i movimenti prevalentemente verticali, altrimenti scorrere la
// pagina cambierebbe mese per sbaglio.
export function useSwipe(onNext, onPrev, { minDistance = 50 } = {}) {
  const start = useRef(null);

  return {
    onTouchStart: (e) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;

      if (Math.abs(dx) < minDistance) return;      // troppo corto: non è uno scorrimento
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // più verticale che orizzontale

      if (dx < 0) onNext();
      else onPrev();
    },
  };
}
