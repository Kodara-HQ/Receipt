import { useEffect, useRef } from "react";
import { btnGhost, btnPrimary } from "../ui/Field";

export default function SignaturePad({ onSave, onChange, hideSave = false }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1c1418";
      dirty.current = false;
      onChangeRef.current?.("");
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function point(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  }

  function start(event) {
    event.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event) {
    if (!drawing.current) return;
    event.preventDefault();
    dirty.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) {
      onChangeRef.current?.(canvasRef.current.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    dirty.current = false;
    onChangeRef.current?.("");
  }

  function save() {
    if (!dirty.current) return;
    onSave?.(canvasRef.current.toDataURL("image/png"));
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-xl border border-dashed border-plum-700/30 bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btnGhost} onClick={clear}>
          Clear
        </button>
        {!hideSave && (
          <button type="button" className={btnPrimary} onClick={save}>
            Save signature
          </button>
        )}
      </div>
    </div>
  );
}
