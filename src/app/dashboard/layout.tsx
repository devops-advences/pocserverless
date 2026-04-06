import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNav } from '@/components/layout/sidebar-nav'
import { TopBar } from '@/components/layout/top-bar'
import type { UserRole } from '@/types/database'

interface Profile {
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  organizations: { name: string } | null
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url, organizations(name)')
    .eq('user_id', user.id)
    .single() as { data: Profile | null }

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav role={profile?.role ?? 'manager'} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar user={user} profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
