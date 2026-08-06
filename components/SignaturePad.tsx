import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

// ============================================================
// Pad de signature manuscrite.
//
// Dessin au doigt ou à la souris sur un <canvas>, exporté en PNG
// base64 — directement exploitable par les générateurs PDF et Word.
// Gère le devicePixelRatio pour rester net sur écran haute densité.
// ============================================================

interface SignaturePadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  /** Signatures déjà enregistrées, sélectionnables sans redessiner. */
  savedSignatures?: { id: number; label: string; imageBase64: string }[];
  onSaveSignature?: (dataUrl: string, label: string) => void;
}

export function SignaturePad({
  value,
  onChange,
  label = "Signature",
  savedSignatures = [],
  onSaveSignature,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);
  const [showSaved, setShowSaved] = useState(false);

  // Prépare le canvas à la bonne résolution physique
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0A2540";
  }, []);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStrokes.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (hasStrokes.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
        <div className="flex gap-2">
          {savedSignatures.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowSaved((s) => !s)}>
              Enregistrées
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Effacer
          </Button>
        </div>
      </div>

      {showSaved && savedSignatures.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          {savedSignatures.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.imageBase64);
                setShowSaved(false);
              }}
              className="rounded border border-gray-200 bg-white p-1 hover:border-gold"
              title={s.label}
            >
              <img src={s.imageBase64} alt={s.label} className="h-10 w-auto" />
            </button>
          ))}
        </div>
      )}

      {/* Une signature déjà choisie s'affiche en aperçu ; le canvas
          reste disponible pour en dessiner une nouvelle. */}
      {value && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
          <img src={value} alt={label} className="h-12 w-auto" />
          <span className="text-xs text-gray-500">Signature appliquée</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-32 w-full touch-none rounded-lg border-2 border-dashed border-gray-300 bg-white"
      />

      {onSaveSignature && value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const name = window.prompt("Nom de cette signature ?");
            if (name) onSaveSignature(value, name);
          }}
        >
          Enregistrer pour réutilisation
        </Button>
      )}
    </div>
  );
}
