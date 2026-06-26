export type Genero = 'Mujer' | 'Hombre' | '';
export type Rol = 'Administrador' | 'Salud' | 'Técnico' | 'Evaluador de Campo';
export type PatologiaClave = 'Hipertensión' | 'Diabetes tipo 2' | 'Artrosis' | 'Osteoporosis' | 'Hipoglucemia' | 'Cardiovascular' | 'Equilibrio' | 'Otra';
export type RegistroSeniorFit = {
  id: string;
  fecha: string;
  versionDocumento: string;
  consentimiento: any;
  seguridad: any;
  participante: any;
  salud: any;
  antropometria: any;
  sft: any;
  resultados: any;
  validacion: any;
};
