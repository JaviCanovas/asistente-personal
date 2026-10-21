import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data: creds, error } = await supabase
    .from('google_credentials')
    .select('*')
    .maybeSingle()

  if (error || !creds) {
    console.error('Error or no creds:', error)
    return
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )

  oauth2Client.setCredentials({
    access_token: creds.access_token,
    refresh_token: creds.refresh_token,
    expiry_date: creds.expiry_date
  })

  // Try refreshing token if needed
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    oauth2Client.setCredentials(credentials)
    await supabase.from('google_credentials').update({
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date,
      updated_at: new Date().toISOString()
    }).eq('id', creds.id)
    console.log('Token refreshed successfully.')
  } catch (err) {
    console.log('Refresh note:', err.message)
  }

  try {
    const tokenInfo = await oauth2Client.getTokenInfo(oauth2Client.credentials.access_token)
    console.log('OAuth Scopes:', tokenInfo.scopes)
  } catch (err) {
    console.error('Error checking token info:', err.message)
  }

  // Test Calendar API
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calList = await calendar.calendarList.list()
    console.log('Calendars count:', calList.data.items?.length)
    console.log('Calendars:', calList.data.items?.map(c => ({ id: c.id, summary: c.summary, primary: c.primary })))
  } catch (err) {
    console.error('Calendar error:', err.message)
  }

  // Test Tasks API
  try {
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client })
    const taskLists = await tasks.tasklists.list()
    console.log('Task lists count:', taskLists.data.items?.length)
    console.log('Task lists:', taskLists.data.items?.map(tl => ({ id: tl.id, title: tl.title })))
  } catch (err) {
    console.error('Google Tasks error:', err.message)
  }
}

main().catch(console.error)
