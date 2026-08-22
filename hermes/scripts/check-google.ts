import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnbyjtbcpxasourdfvfl.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('google_credentials').select('*')
  if (error) {
    console.error('Error fetching google_credentials:', error)
  } else {
    console.log('google_credentials table content:')
    console.log(data)
  }
}

check()
