import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/googleCalendar'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Falta el código de autorización' }, { status: 400 })
  }

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('No se recibió el token de acceso')
    }

    const supabase = await createClient()

    // Comprobar si ya existe un registro de credenciales
    const { data: creds } = await supabase
      .from('google_credentials')
      .select('id')
      .maybeSingle()

    const credsData: any = {
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      updated_at: new Date().toISOString()
    }

    // El Refresh Token solo se entrega en la primera autorización
    if (tokens.refresh_token) {
      credsData.refresh_token = tokens.refresh_token
    }

    if (creds?.id) {
      // Actualizar credenciales existentes
      const { error } = await supabase
        .from('google_credentials')
        .update(credsData)
        .eq('id', creds.id)
      
      if (error) throw error
    } else {
      // Insertar nuevo registro
      const { error } = await supabase
        .from('google_credentials')
        .insert(credsData)
      
      if (error) throw error
    }

    // Redirigir al usuario al Calendario tras la vinculación exitosa
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}/calendario?google_connected=true`)
  } catch (err: any) {
    console.error('[Google OAuth Callback Error]', err.message)
    return NextResponse.json({ error: 'Error durante la autenticación', details: err.message }, { status: 500 })
  }
}
