'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/dashboard/agents', label: 'Agents', icon: '🤖' },
  { href: '/dashboard/runs', label: 'Exécutions', icon: '📋' },
  { href: '/dashboard/reports', label: 'Rapports', icon: '📊' },
]

const adminItems = [
  { href: '/dashboard/admin/clients', label: 'Clients', icon: '🏢' },
  { href: '/dashboard/admin/agents', label: 'Agents', icon: '⚙️' },
  { href: '/dashboard/admin/users', label: 'Utilisateurs', icon: '👥' },
]

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname()

  return (
    <aside className="w-60 border-r bg-card flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg">AI Platform</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Agent Monitor</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {role === 'master' && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
