import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnbyjtbcpxasourdfvfl.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkItems() {
  const { data, error } = await supabase
    .from('items')
    .select('id, titulo, fecha_evento, fecha_limite, google_event_id')
    .or('fecha_evento.not.is.null,fecha_limite.not.is.null')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Found ${data.length} items with dates.`)
  const pending = data.filter(item => !item.google_event_id)
  const alreadySynced = data.filter(item => !!item.google_event_id)
  console.log(`${pending.length} pending to sync (no google_event_id).`)
  console.log(`${alreadySynced.length} already have google_event_id.`)
}

checkItems()
