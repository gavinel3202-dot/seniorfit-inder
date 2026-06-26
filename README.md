# SeniorFit INDER v1.0

Plataforma de Valoración Funcional para Personas Mayores, basada en Senior Fitness Test, consentimiento informado, cribado de seguridad, anamnesis, antropometría avanzada, motor de alertas y dashboard.

## Ejecutar localmente

```bash
npm install
npm run dev
```

## Desplegar en Vercel

- Framework: Next.js
- Build command: `npm run build`
- Output: automático de Next.js

## Firebase opcional

Si no configuras Firebase, la aplicación funciona en modo local con `localStorage`. Para nube, crea estas variables en Vercel:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Colección usada: `evaluaciones_seniorfit`.

## Notas

Esta versión es una base operable. Los rangos SFT incluidos son referenciales iniciales y deben ser ajustados con las tablas oficiales definitivas que adopte el Observatorio.
