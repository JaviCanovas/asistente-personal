import { NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/googleCalendar'

export async function GET() {
  const oauth2Client = getOAuth2Client()
  
  // Generar URL de autenticación solicitando acceso offline (Refresh Token) y acceso a los eventos del calendario
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Forzar consentimiento para asegurar que Google nos entregue el Refresh Token
    scope: [
      'https://www.googleapis.com/auth/calendar.events'
    ]
  })

  return NextResponse.redirect(authUrl)
}
