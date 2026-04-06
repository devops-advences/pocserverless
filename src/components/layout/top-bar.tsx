'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { User } from '@supabase/supabase-js'

interface TopBarProps {
  user: User
  profile: {
    full_name: string | null
    avatar_url: string | null
    role: string
    organizations?: { name: string } | null
  } | null
}

export function TopBar({ user, profile }: TopBarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user.email?.[0].toUpperCase() ?? '?'

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 bg-card">
      <div className="text-sm text-muted-foreground">
        {profile?.organizations?.name ?? 'Organisation'}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="capitalize">
          {profile?.role ?? 'manager'}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0" />
          }>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? ''} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name ?? 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive cursor-pointer"
            >
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
