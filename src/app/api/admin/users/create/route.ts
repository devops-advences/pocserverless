import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single() as { data: { role: string } | null }

  if (profile?.role !== 'master') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, full_name, password, org_id, role } = await request.json()
  const admin = createAdminClient()

  const { data: newUser, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: profileError } = await admin.from('profiles').insert({
    user_id: newUser.user.id, org_id, role: role ?? 'manager',
    full_name: full_name || null
  })

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
