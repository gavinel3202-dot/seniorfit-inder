import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SeniorFit INDER',
  description: 'Plataforma de Valoración Funcional para Personas Mayores'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
