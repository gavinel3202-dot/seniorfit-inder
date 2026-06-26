import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseDisponible = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const app = firebaseDisponible && !getApps().length ? initializeApp(firebaseConfig as any) : (getApps()[0] || null);
export const db = firebaseDisponible && app ? getFirestore(app) : null;

const LS_KEY = 'seniorfit_inder_registros_v1';

export async function guardarRegistro(registro:any) {
  if (db) {
    const ref = await addDoc(collection(db, 'evaluaciones_seniorfit'), registro);
    return ref.id;
  }
  const registros = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  registros.push(registro);
  localStorage.setItem(LS_KEY, JSON.stringify(registros));
  return registro.id;
}

export async function listarRegistros() {
  if (db) {
    const snap = await getDocs(collection(db, 'evaluaciones_seniorfit'));
    return snap.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
  }
  return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
}

export async function actualizarRegistro(firebaseId:string, data:any) {
  if (db && firebaseId) return updateDoc(doc(db, 'evaluaciones_seniorfit', firebaseId), data);
  const registros = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const nuevos = registros.map((r:any) => r.id === data.id ? data : r);
  localStorage.setItem(LS_KEY, JSON.stringify(nuevos));
}
