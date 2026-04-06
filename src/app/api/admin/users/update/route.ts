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

  const { user_id, email, password, full_name, role, org_id } = await request.json()
  const admin = createAdminClient()

  // Mettre à jour auth (email + password)
  const authUpdate: { email?: string; password?: string } = {}
  if (email) authUpdate.email = email
  if (password) authUpdate.password = password

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(user_id, authUpdate)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mettre à jour le profil
  const profileUpdate: { full_name?: string; role?: string; org_id?: string } = {}
  if (full_name !== undefined) profileUpdate.full_name = full_name
  if (role) profileUpdate.role = role
  if (org_id) profileUpdate.org_id = org_id

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdate).eq('user_id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
