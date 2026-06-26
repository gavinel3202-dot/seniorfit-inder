export function calcularEdad(fechaNacimiento: string) {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return Math.max(0, edad);
}

export function calcularIMC(peso: number, talla: number) {
  if (!peso || !talla) return 0;
  return Number((peso / (talla * talla)).toFixed(1));
}

export function clasificarIMC(imc: number) {
  if (!imc) return 'Sin dato';
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidad I';
  if (imc < 40) return 'Obesidad II';
  return 'Obesidad III';
}

const rangos: Record<string, any> = {
  '60-64': { Mujer: { chair:[12,17], arm:[13,19], step:[75,107], walk:[545,660], agility:[4.4,6.0] }, Hombre: { chair:[14,19], arm:[16,22], step:[87,115], walk:[610,735], agility:[4.0,5.6] } },
  '65-69': { Mujer: { chair:[11,16], arm:[12,18], step:[73,107], walk:[500,635], agility:[4.8,6.4] }, Hombre: { chair:[12,18], arm:[15,21], step:[86,116], walk:[560,700], agility:[4.3,5.7] } },
  '70-74': { Mujer: { chair:[10,15], arm:[12,17], step:[68,101], walk:[480,615], agility:[4.9,7.1] }, Hombre: { chair:[12,17], arm:[14,21], step:[80,110], walk:[545,680], agility:[4.2,6.0] } },
  '75-79': { Mujer: { chair:[10,15], arm:[11,17], step:[68,100], walk:[435,585], agility:[5.2,7.4] }, Hombre: { chair:[11,17], arm:[13,19], step:[73,109], walk:[470,640], agility:[4.6,7.2] } },
  '80-84': { Mujer: { chair:[9,14], arm:[10,16], step:[60,91], walk:[385,540], agility:[5.7,8.7] }, Hombre: { chair:[10,15], arm:[13,19], step:[71,103], walk:[445,605], agility:[5.2,7.6] } },
  '85-89': { Mujer: { chair:[8,13], arm:[10,15], step:[55,85], walk:[340,510], agility:[6.2,9.6] }, Hombre: { chair:[8,14], arm:[11,17], step:[59,91], walk:[380,570], agility:[5.8,8.9] } },
};

export function rangoEdad(edad:number) {
  if (edad < 65) return '60-64';
  if (edad < 70) return '65-69';
  if (edad < 75) return '70-74';
  if (edad < 80) return '75-79';
  if (edad < 85) return '80-84';
  return '85-89';
}

function comparar(valor:number, rango:number[], invertido=false) {
  if (!valor && valor !== 0) return {estado:'Sin dato', color:'Gris'};
  const [inf, sup] = rango;
  if (invertido) {
    if (valor <= inf) return {estado:'Sobre referencia', color:'Verde'};
    if (valor <= sup) return {estado:'Normal', color:'Verde'};
    return {estado:'Bajo referencia', color:'Rojo'};
  }
  if (valor < inf) return {estado:'Bajo referencia', color:'Rojo'};
  if (valor <= sup) return {estado:'Normal', color:'Verde'};
  return {estado:'Sobre referencia', color:'Verde'};
}

export function evaluarSFT(edad:number, genero:string, sft:any) {
  const grupo = rangoEdad(edad);
  const ref = rangos[grupo]?.[genero] || rangos['60-64'].Mujer;
  return {
    grupoEdad: grupo,
    chair: comparar(Number(sft.chairStand), ref.chair),
    arm: comparar(Number(sft.armCurl), ref.arm),
    step: comparar(Number(sft.step2min), ref.step),
    walk: comparar(Number(sft.walk6min), ref.walk),
    agility: comparar(Number(sft.agilityBest), ref.agility, true),
  };
}

export function evaluarObesidadSarcopenica(imc:number, pantorrilla:number, sftEval:any, prension:number) {
  const bajas = ['chair','arm','step'].filter(k => sftEval?.[k]?.estado === 'Bajo referencia').length;
  if (imc > 28 && pantorrilla > 34 && prension > 30) return { nivel:'Perfil de alta masa, alta funcionalidad', color:'Verde', accion:'No activar alerta de obesidad sarcopénica.' };
  if (imc > 30 && pantorrilla < 29 && bajas >= 2) return { nivel:'Crítico', color:'Rojo', accion:'Derivación prioritaria a valoración médica/nutricional.' };
  if (imc >= 28 && imc <= 30 && pantorrilla < 31 && bajas >= 2) return { nivel:'Alto', color:'Naranja', accion:'Ingreso prioritario a entrenamiento de fuerza supervisado.' };
  if (imc > 28 && bajas >= 1) return { nivel:'Moderado', color:'Amarillo', accion:'Seguimiento mensual y plan correctivo.' };
  return { nivel:'Bajo', color:'Verde', accion:'Continuar seguimiento y promoción de actividad física.' };
}

export function exportarCSV(registros:any[]) {
  if (!registros.length) return '';
  const rows = registros.map(r => ({
    fecha: r.fecha,
    nombre: r.participante?.nombre,
    documento: r.participante?.documento,
    edad: r.participante?.edad,
    genero: r.participante?.genero,
    imc: r.resultados?.imc,
    clasificacionIMC: r.resultados?.clasificacionIMC,
    riesgo: r.resultados?.obesidadSarcopenica?.nivel,
    estadoValidacion: r.validacion?.estado
  }));
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map(row => Object.values(row).map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
  return `${header}\n${body}`;
}
