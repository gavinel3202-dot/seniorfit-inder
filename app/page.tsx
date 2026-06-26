'use client'

import React, { useEffect, useMemo, useState } from 'react'
import FirmaDigital from '@/components/FirmaDigital'
import { AlertTriangle, CheckCircle2, Cloud, Download, FileText, Shield, Stethoscope, UserRound } from 'lucide-react'
import { calcularEdad, calcularIMC, clasificarIMC, evaluarObesidadSarcopenica, evaluarSFT, exportarCSV } from '@/lib/calculos'
import { firebaseDisponible, guardarRegistro, listarRegistros } from '@/lib/firebase'

const VERSION_DOCUMENTO = 'CONSENTIMIENTO-SFT-INDER-2026-V1.0'
const patologias = ['Hipertensión','Diabetes tipo 2','Artrosis','Osteoporosis','Hipoglucemia','Cardiovascular','Equilibrio','Otra']

const consentimientoTexto = `CONSENTIMIENTO INFORMADO: VALORACIÓN DE CONDICIÓN FÍSICA - BATERÍA SENIOR FITNESS TEST (SFT)\n\nObjetivo: entiendo que la valoración permite identificar mi condición física funcional, capacidades de fuerza, resistencia, flexibilidad, agilidad y posibles factores de riesgo asociados a la pérdida de independencia funcional.\n\nNaturaleza de las pruebas: he sido informado(a) de que realizaré pruebas funcionales adaptadas para personas mayores de 60 años, incluyendo sentarse y levantarse, flexiones de brazo, marcha o caminata, flexibilidad y levantarse/caminar.\n\nRiesgos: aunque las pruebas son seguras, existe posibilidad de fatiga, dificultad para respirar, mareo, dolor articular, dolor en el pecho, pérdida de equilibrio o esfuerzo excesivo. Me comprometo a informar cualquier síntoma inmediatamente.\n\nSeguridad: entiendo que si presento síntomas de alarma, la prueba se detendrá y el personal activará el protocolo de seguridad.\n\nGestión de datos: autorizo el uso de mis datos para fines de caracterización funcional, investigación, seguimiento estadístico y priorización de programas del INDER Medellín, bajo reserva y confidencialidad.\n\nDeclaro que la información entregada sobre enfermedades, medicamentos y síntomas es verdadera y completa.`

function Input({label, ...props}: any) { return <div className="space-y-1"><label className="big-label">{label}</label><input className="field" {...props}/></div> }
function Select({label, children, ...props}: any) { return <div className="space-y-1"><label className="big-label">{label}</label><select className="field" {...props}>{children}</select></div> }
function Area({label, ...props}: any) { return <div className="space-y-1"><label className="big-label">{label}</label><textarea className="field min-h-[90px]" {...props}/></div> }

export default function Page() {
  const [tab, setTab] = useState<'nueva'|'dashboard'>('nueva')
  const [registros, setRegistros] = useState<any[]>([])
  const [rol, setRol] = useState('Evaluador de Campo')
  const [cons, setCons] = useState({ acepta:false, nombre:'', documento:'', firmaParticipante:'', firmaEvaluador:'', lugar:'Medellín', leido:false })
  const [seg, setSeg] = useState({ contraindicacion:false, insuficiencia:false, dolorPecho:false, vertigo:false, angina:false, dolorArticular:false, presionAlta:false, esfuerzo:false, confusion:false, disnea:false })
  const [part, setPart] = useState({ nombre:'', documento:'', fechaNacimiento:'', edad:0, genero:'', telefono:'', correo:'', comuna:'', barrio:'', estrato:'', escolaridad:'', viveSolo:'No', cuidador:'' })
  const [salud, setSalud] = useState<any>({ patologias:{}, notas:'', medicamentosRiesgo:'' })
  const [ant, setAnt] = useState({ peso:'', talla:'', perimetroAbdominal:'', pantorrilla:'', prension:'', sistolica:'', diastolica:'', fc:'', spo2:'', glucemia:'' })
  const [sft, setSft] = useState({ chairStand:'', armCurl:'', aerobica:'2min', step2min:'', walk6min:'', flexionTronco:'', juntarManos:'', agility1:'', agility2:'', agilityBest:'' })
  const [validacion, setValidacion] = useState({ estado:'En Proceso', saludGeneral:'', ratifica:'', justificacion:'', profesional:'', cedula:'', firma:'' })
  const [msg, setMsg] = useState('')

  useEffect(() => { cargar() }, [])
  async function cargar(){ try { setRegistros(await listarRegistros()) } catch(e){} }
  useEffect(() => { setPart(p => ({...p, edad: calcularEdad(p.fechaNacimiento)})) }, [part.fechaNacimiento])
  useEffect(() => { const best = Math.min(Number(sft.agility1)||999, Number(sft.agility2)||999); setSft(v => ({...v, agilityBest: best === 999 ? '' : String(best)})) }, [sft.agility1, sft.agility2])

  const bloqueoSeguridad = Object.values(seg).some(Boolean)
  const imc = calcularIMC(Number(ant.peso), Number(ant.talla))
  const sftEval = useMemo(() => evaluarSFT(part.edad, part.genero, sft), [part.edad, part.genero, sft])
  const alerta = useMemo(() => evaluarObesidadSarcopenica(imc, Number(ant.pantorrilla), sftEval, Number(ant.prension)), [imc, ant.pantorrilla, ant.prension, sftEval])

  function setPatologia(p:string, campo:string, valor:any) {
    setSalud((s:any) => ({ ...s, patologias: { ...s.patologias, [p]: { ...(s.patologias[p]||{}), activo: campo==='activo' ? valor : (s.patologias[p]?.activo || false), [campo]: valor } } }))
  }

  function validar() {
    if (!cons.leido || !cons.acepta || !cons.firmaParticipante || !cons.firmaEvaluador) return 'Debe leer, aceptar y firmar el consentimiento informado.'
    if (!part.nombre || !part.documento || !part.fechaNacimiento || !part.genero) return 'Complete datos básicos del participante.'
    if (bloqueoSeguridad) return 'La ficha de seguridad contiene una alerta crítica. No se puede iniciar el test.'
    for (const p of patologias) {
      const item = salud.patologias[p]
      if (item?.activo) {
        if (p === 'Otra' && !item.cual) return 'Si marca Otra patología, debe indicar cuál.'
        if (!item.medicamento) return `Debe registrar medicamento para ${p}.`
      }
    }
    if (!ant.peso || !ant.talla) return 'Registre peso y talla.'
    return ''
  }

  async function guardar() {
    const error = validar(); if (error) { setMsg(error); return }
    const registro = {
      id: crypto.randomUUID(), fecha: new Date().toISOString(), versionDocumento: VERSION_DOCUMENTO,
      consentimiento:{...cons, fechaConsentimiento:new Date().toISOString(), idDispositivo:navigator.userAgent.slice(0,120)}, seguridad:seg, participante:part, salud, antropometria:ant, sft,
      resultados:{ imc, clasificacionIMC: clasificarIMC(imc), sftEval, obesidadSarcopenica: alerta, fuerzaRelativa: ant.peso ? Number(((Number(sft.chairStand||0)+Number(sft.armCurl||0))/Number(ant.peso)).toFixed(2)) : 0 },
      validacion
    }
    await guardarRegistro(registro); setMsg('Registro guardado correctamente.'); await cargar(); setTab('dashboard')
  }

  function descargarCSV(){ const csv = exportarCSV(registros); const blob = new Blob([csv], {type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='seniorfit-inder-registros.csv'; a.click(); }

  return <main className="min-h-screen">
    <header className="bg-emerald-800 text-white px-6 py-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-3xl font-black">SeniorFit INDER</div>
          <div className="text-xl font-semibold">Plataforma de Valoración Funcional para Personas Mayores</div>
          <div className="opacity-90">Observatorio de Aptitud Física para Personas Mayores · Versión 1.0</div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="px-4 py-2 rounded-full bg-white/15 font-bold flex gap-2"><Cloud/> {firebaseDisponible ? 'Conectado a Firebase' : 'Modo local / sin Firebase'}</span>
          <select className="text-slate-900 rounded-xl p-3 font-bold" value={rol} onChange={e=>setRol(e.target.value)}><option>Administrador</option><option>Salud</option><option>Técnico</option><option>Evaluador de Campo</option></select>
        </div>
      </div>
    </header>

    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex gap-3 flex-wrap"><button className={`btn ${tab==='nueva'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('nueva')}>Nueva valoración</button><button className={`btn ${tab==='dashboard'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('dashboard')}>Consultar valoraciones</button></div>
      {msg && <div className="alert bg-amber-100 border border-amber-300 text-amber-900">{msg}</div>}

      {tab==='nueva' && <div className="space-y-6">
        <section className="card p-6 space-y-4"><h2 className="text-2xl font-black flex gap-2"><FileText/> 1. Consentimiento informado</h2><pre className="whitespace-pre-wrap bg-slate-50 p-5 rounded-2xl text-lg leading-8 max-h-[430px] overflow-auto border">{consentimientoTexto}</pre><label className="flex gap-3 items-center text-xl font-bold"><input type="checkbox" className="w-7 h-7" checked={cons.leido} onChange={e=>setCons({...cons, leido:e.target.checked})}/> Confirmo que el consentimiento fue leído completamente</label><label className="flex gap-3 items-center text-xl font-bold"><input type="checkbox" className="w-7 h-7" checked={cons.acepta} onChange={e=>setCons({...cons, acepta:e.target.checked})}/> Acepto los términos del consentimiento informado</label><div className="grid md:grid-cols-3 gap-4"><Input label="Nombre participante/tutor" value={cons.nombre} onChange={(e:any)=>setCons({...cons,nombre:e.target.value})}/><Input label="Documento" value={cons.documento} onChange={(e:any)=>setCons({...cons,documento:e.target.value})}/><Input label="Lugar" value={cons.lugar} onChange={(e:any)=>setCons({...cons,lugar:e.target.value})}/></div><FirmaDigital label="Firma digital del participante/tutor" value={cons.firmaParticipante} onChange={v=>setCons({...cons,firmaParticipante:v})}/><FirmaDigital label="Firma digital del evaluador" value={cons.firmaEvaluador} onChange={v=>setCons({...cons,firmaEvaluador:v})}/></section>

        <section className="card p-6 space-y-4"><h2 className="text-2xl font-black flex gap-2"><Shield/> 2. Ficha de seguridad</h2><div className="grid md:grid-cols-2 gap-3">{Object.entries({contraindicacion:'Contraindicación médica para ejercicio físico', insuficiencia:'Insuficiencia cardíaca congestiva', dolorPecho:'Dolor en el pecho durante esfuerzo', vertigo:'Vértigos o pérdida de equilibrio', angina:'Angina durante esfuerzo', dolorArticular:'Dolor articular incapacitante', presionAlta:'Presión arterial ≥160/100 no controlada', esfuerzo:'Fatiga inusual o esfuerzo excesivo', confusion:'Confusión', disnea:'Dificultad para respirar'}).map(([k,l])=><label key={k} className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl text-lg font-bold"><input type="checkbox" className="w-6 h-6" checked={(seg as any)[k]} onChange={e=>setSeg({...seg,[k]:e.target.checked})}/>{l}</label>)}</div>{bloqueoSeguridad && <div className="alert bg-red-100 text-red-900 border border-red-300 flex gap-2"><AlertTriangle/> Evaluación bloqueada. Detenga la prueba y active protocolo de emergencia. Línea de emergencias: 123. Contactar apoyo médico institucional.</div>}</section>

        <section className="card p-6 space-y-4"><h2 className="text-2xl font-black flex gap-2"><UserRound/> 3. Datos del participante</h2><div className="grid md:grid-cols-4 gap-4"><Input label="Nombre completo" value={part.nombre} onChange={(e:any)=>setPart({...part,nombre:e.target.value})}/><Input label="Documento" value={part.documento} onChange={(e:any)=>setPart({...part,documento:e.target.value})}/><Input label="Fecha nacimiento" type="date" value={part.fechaNacimiento} onChange={(e:any)=>setPart({...part,fechaNacimiento:e.target.value})}/><Input label="Edad" value={part.edad} readOnly/><Select label="Género" value={part.genero} onChange={(e:any)=>setPart({...part,genero:e.target.value})}><option value="">Seleccione</option><option>Mujer</option><option>Hombre</option></Select><Input label="Teléfono" value={part.telefono} onChange={(e:any)=>setPart({...part,telefono:e.target.value})}/><Input label="Correo" value={part.correo} onChange={(e:any)=>setPart({...part,correo:e.target.value})}/><Input label="Comuna" value={part.comuna} onChange={(e:any)=>setPart({...part,comuna:e.target.value})}/><Input label="Barrio" value={part.barrio} onChange={(e:any)=>setPart({...part,barrio:e.target.value})}/><Input label="Estrato" value={part.estrato} onChange={(e:any)=>setPart({...part,estrato:e.target.value})}/><Input label="Escolaridad" value={part.escolaridad} onChange={(e:any)=>setPart({...part,escolaridad:e.target.value})}/><Select label="Vive solo" value={part.viveSolo} onChange={(e:any)=>setPart({...part,viveSolo:e.target.value})}><option>No</option><option>Sí</option></Select></div></section>

        <section className="card p-6 space-y-4"><h2 className="text-2xl font-black flex gap-2"><Stethoscope/> 4. Salud, patologías y medicación</h2><div className="grid md:grid-cols-2 gap-4">{patologias.map(p=>{ const item=salud.patologias[p]||{}; return <div key={p} className="border rounded-2xl p-4 bg-slate-50 space-y-3"><label className="flex gap-3 items-center text-xl font-black"><input type="checkbox" className="w-7 h-7" checked={item.activo||false} onChange={e=>setPatologia(p,'activo',e.target.checked)}/>{p}</label>{item.activo && <div className="grid gap-3">{p==='Otra' && <Input label="¿Cuál patología?" value={item.cual||''} onChange={(e:any)=>setPatologia(p,'cual',e.target.value)}/>}<Input label="Medicamento obligatorio" value={item.medicamento||''} onChange={(e:any)=>setPatologia(p,'medicamento',e.target.value)}/><Input label="Dosis / frecuencia" value={item.dosis||''} onChange={(e:any)=>setPatologia(p,'dosis',e.target.value)}/><Input label="Motivo del consumo" value={item.motivo||p} onChange={(e:any)=>setPatologia(p,'motivo',e.target.value)}/></div>}</div>})}</div><Area label="Notas de seguridad para el examinador" value={salud.notas} onChange={(e:any)=>setSalud({...salud,notas:e.target.value})}/></section>

        <section className="card p-6 space-y-4"><h2 className="text-2xl font-black">5. Antropometría y signos vitales</h2><div className="grid md:grid-cols-4 gap-4"><Input label="Peso kg" type="number" value={ant.peso} onChange={(e:any)=>setAnt({...ant,peso:e.target.value})}/><Input label="Talla m" type="number" step="0.01" value={ant.talla} onChange={(e:any)=>setAnt({...ant,talla:e.target.value})}/><Input label="IMC automático" value={`${imc || ''} ${clasificarIMC(imc)}`} readOnly/><Input label="Perímetro abdominal cm" type="number" value={ant.perimetroAbdominal} onChange={(e:any)=>setAnt({...ant,perimetroAbdominal:e.target.value})}/><Input label="Pantorrilla cm" type="number" value={ant.pantorrilla} onChange={(e:any)=>setAnt({...ant,pantorrilla:e.target.value})}/><Input label="Prensión kg" type="number" value={ant.prension} onChange={(e:any)=>setAnt({...ant,prension:e.target.value})}/><Input label="TA sistólica" type="number" value={ant.sistolica} onChange={(e:any)=>setAnt({...ant,sistolica:e.target.value})}/><Input label="TA diastólica" type="number" value={ant.diastolica} onChange={(e:any)=>setAnt({...ant,diastolica:e.target.value})}/><Input label="FC" type="number" value={ant.fc} onChange={(e:any)=>setAnt({...ant,fc:e.target.value})}/><Input label="SpO2" type="number" value={ant.spo2} onChange={(e:any)=>setAnt({...ant,spo2:e.target.value})}/><Input label="Glucemia opcional" type="number" value={ant.glucemia} onChange={(e:any)=>setAnt({...ant,glucemia:e.target.value})}/></div></section>

        <section className="card p-6 space-y-4"><h2 className="text-2xl font-black">6. Senior Fitness Test</h2><div className="grid md:grid-cols-4 gap-4"><Input label="Sentarse/levantarse 30s" type="number" value={sft.chairStand} onChange={(e:any)=>setSft({...sft,chairStand:e.target.value})}/><Input label="Flexión de brazo 30s" type="number" value={sft.armCurl} onChange={(e:any)=>setSft({...sft,armCurl:e.target.value})}/><Select label="Prueba aeróbica" value={sft.aerobica} onChange={(e:any)=>setSft({...sft,aerobica:e.target.value})}><option value="2min">Marcha 2 minutos</option><option value="6min">Caminata 6 minutos</option></Select>{sft.aerobica==='2min'?<Input label="Pasos 2 min" type="number" value={sft.step2min} onChange={(e:any)=>setSft({...sft,step2min:e.target.value})}/>:<Input label="Yardas 6 min" type="number" value={sft.walk6min} onChange={(e:any)=>setSft({...sft,walk6min:e.target.value})}/>}<Input label="Flexión tronco silla +/-" type="number" value={sft.flexionTronco} onChange={(e:any)=>setSft({...sft,flexionTronco:e.target.value})}/><Input label="Juntar manos espalda +/-" type="number" value={sft.juntarManos} onChange={(e:any)=>setSft({...sft,juntarManos:e.target.value})}/><Input label="Levántate y camina intento 1" type="number" value={sft.agility1} onChange={(e:any)=>setSft({...sft,agility1:e.target.value})}/><Input label="Levántate y camina intento 2" type="number" value={sft.agility2} onChange={(e:any)=>setSft({...sft,agility2:e.target.value})}/><Input label="Mejor tiempo" value={sft.agilityBest} readOnly/></div><div className="grid md:grid-cols-3 gap-3">{Object.entries(sftEval).filter(([k])=>k!=='grupoEdad').map(([k,v]:any)=><div key={k} className={`alert ${v.color==='Rojo'?'bg-red-100 text-red-900':'bg-emerald-100 text-emerald-900'}`}>{k}: {v.estado}</div>)}</div></section>

        <section className="card p-6 space-y-4"><h2 className="text-2xl font-black">7. Resultado automático y validación profesional</h2><div className={`alert ${alerta.color==='Rojo'?'bg-red-100 text-red-900':alerta.color==='Naranja'?'bg-orange-100 text-orange-900':alerta.color==='Amarillo'?'bg-yellow-100 text-yellow-900':'bg-emerald-100 text-emerald-900'}`}>Riesgo de obesidad sarcopénica: {alerta.nivel}. {alerta.accion}</div><div className="grid md:grid-cols-3 gap-4"><Select label="Estado de salud general" value={validacion.saludGeneral} onChange={(e:any)=>setValidacion({...validacion,saludGeneral:e.target.value})}><option value="">Pendiente</option><option>Apto</option><option>Apto con restricciones</option><option>No apto</option></Select><Select label="Estado de validación" value={validacion.estado} onChange={(e:any)=>setValidacion({...validacion,estado:e.target.value})}><option>En Proceso</option><option>Revisión Profesional</option><option>Priorizado/Aprobado</option><option>Monitoreo</option></Select><Select label="¿Ratifica alerta?" value={validacion.ratifica} onChange={(e:any)=>setValidacion({...validacion,ratifica:e.target.value})}><option value="">Pendiente</option><option>Sí</option><option>No</option></Select><Input label="Profesional" value={validacion.profesional} onChange={(e:any)=>setValidacion({...validacion,profesional:e.target.value})}/><Input label="Cédula / registro" value={validacion.cedula} onChange={(e:any)=>setValidacion({...validacion,cedula:e.target.value})}/></div><Area label="Justificación técnica o clínica" value={validacion.justificacion} onChange={(e:any)=>setValidacion({...validacion,justificacion:e.target.value})}/>{(rol==='Salud'||rol==='Administrador') && <FirmaDigital label="Firma profesional" value={validacion.firma} onChange={v=>setValidacion({...validacion,firma:v})}/>}<button className="btn btn-primary w-full" onClick={guardar}>Guardar valoración</button></section>
      </div>}

      {tab==='dashboard' && <section className="card p-6 space-y-4"><div className="flex justify-between gap-3 flex-wrap"><h2 className="text-2xl font-black">Dashboard Observatorio</h2><button className="btn btn-secondary flex gap-2" onClick={descargarCSV}><Download/> Descargar CSV</button></div><div className="grid md:grid-cols-4 gap-4"><div className="alert bg-slate-100">Total: {registros.length}</div><div className="alert bg-red-100">Crítico/Alto: {registros.filter(r=>['Crítico','Alto'].includes(r.resultados?.obesidadSarcopenica?.nivel)).length}</div><div className="alert bg-emerald-100">Firebase: {firebaseDisponible?'Activo':'No configurado'}</div><div className="alert bg-blue-100">Rol: {rol}</div></div><div className="overflow-auto"><table className="w-full text-left border-collapse text-lg"><thead><tr className="bg-slate-100"><th className="p-3">Fecha</th><th className="p-3">Nombre</th><th className="p-3">Edad</th><th className="p-3">IMC</th><th className="p-3">Riesgo</th><th className="p-3">Estado</th></tr></thead><tbody>{registros.map((r:any)=><tr key={r.id||r.firebaseId} className="border-t"><td className="p-3">{new Date(r.fecha).toLocaleString()}</td><td className="p-3 font-bold">{r.participante?.nombre}</td><td className="p-3">{r.participante?.edad}</td><td className="p-3">{r.resultados?.imc}</td><td className="p-3">{r.resultados?.obesidadSarcopenica?.nivel}</td><td className="p-3">{r.validacion?.estado}</td></tr>)}</tbody></table></div></section>}
    </div>

    <button className="fixed right-4 bottom-4 btn btn-danger shadow-xl" onClick={()=>alert('PROTOCOLO DE EMERGENCIA\n1. Detener la prueba.\n2. Sentar o recostar al participante.\n3. Verificar signos vitales.\n4. Contactar línea 123 o apoyo médico institucional.\n5. Registrar incidente en la plataforma.')}>Emergencia 123</button>
  </main>
}
