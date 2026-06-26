'use client'
import React, { useRef, useState } from 'react'

export default function FirmaDigital({ label, value, onChange }: { label:string, value:string, onChange:(v:string)=>void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draw, setDraw] = useState(false);
  const pos = (e:any) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e:any) => { setDraw(true); const ctx = canvasRef.current!.getContext('2d')!; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const move = (e:any) => { if(!draw) return; e.preventDefault(); const ctx=canvasRef.current!.getContext('2d')!; const p=pos(e); ctx.lineWidth=3; ctx.lineCap='round'; ctx.strokeStyle='#0f172a'; ctx.lineTo(p.x,p.y); ctx.stroke(); onChange(canvasRef.current!.toDataURL('image/png')); };
  const end = () => setDraw(false);
  const clear = () => { const c=canvasRef.current!; c.getContext('2d')!.clearRect(0,0,c.width,c.height); onChange(''); };
  return <div className="space-y-2">
    <label className="big-label">{label}</label>
    <canvas ref={canvasRef} width={650} height={180} className="w-full bg-white border-2 border-slate-300 rounded-2xl touch-none" onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
    <div className="flex gap-2 items-center"><button type="button" className="btn btn-secondary" onClick={clear}>Limpiar firma</button>{value && <span className="font-bold text-emerald-700">Firma capturada</span>}</div>
  </div>
}
