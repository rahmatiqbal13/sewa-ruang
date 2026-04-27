import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, ShieldCheck } from 'lucide-react'
import { ChangeRoleButton } from './ChangeRoleButton'
import { EditUserDialog } from './EditUserDialog'
import { DeleteUserButton } from './DeleteUserButton'
import { ResetPasswordButton } from './ResetPasswordButton'
import { AddUserDialog } from './AddUserDialog'
import { formatDateTime } from '@/lib/utils'

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800 border border-purple-200' },
  admin:       { label: 'Admin',       className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  staff:       { label: 'Staff',       className: 'bg-zinc-100 text-zinc-700 border border-zinc-200' },
  borrower:    { label: 'Peminjam',    className: 'bg-green-100 text-green-800 border border-green-200' },
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: currentProfile }, { data: users }] = await Promise.all([
    sb.from('users').select('role').eq('id', currentUser!.id).single() as Promise<{ data: { role: string } | null }>,
    sb.from('users')
      .select('id, name, email, role, phone, institution, class_division, identity_number, telegram_username, created_at')
      .order('role').order('name') as Promise<{
        data: Array<{
          id: string; name: string; email: string; role: string
          phone: string | null; institution: string | null; class_division: string | null
          identity_number: string | null; telegram_username: string | null; created_at: string
        }> | null
      }>,
  ])

  const isSuperAdmin = currentProfile?.role === 'super_admin'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Pengguna
            {isSuperAdmin && <ShieldCheck className="h-5 w-5 text-purple-600" />}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSuperAdmin ? 'Kelola semua akun — Super Admin mode aktif' : 'Kelola akun dan peran pengguna sistem'}
          </p>
        </div>
        {isSuperAdmin && <AddUserDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Semua Pengguna ({users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Instansi / Kelas</TableHead>
                {isSuperAdmin && <TableHead>No. Identitas</TableHead>}
                {isSuperAdmin && <TableHead>Telegram</TableHead>}
                <TableHead>Terdaftar</TableHead>
                <TableHead>Role</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Belum ada pengguna
                  </TableCell>
                </TableRow>
              )}
              {users?.map((u) => {
                const badge = ROLE_BADGE[u.role]
                const isSelf = u.id === currentUser?.id
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {u.name}
                      {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(Anda)</span>}
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">{u.phone ?? <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.institution ?? '-'}
                      {u.class_division && <span className="block text-xs">{u.class_division}</span>}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-sm font-mono">
                        {u.identity_number ?? <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    )}
                    {isSuperAdmin && (
                      <TableCell className="text-sm">
                        {u.telegram_username ?? <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(u.created_at)}
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge?.className}`}>
                          {badge?.label ?? u.role}
                        </span>
                      ) : (
                        <ChangeRoleButton userId={u.id} currentRole={u.role} isSuperAdmin={isSuperAdmin} />
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {!isSelf && (
                          <div className="flex items-center gap-1 justify-end">
                            <EditUserDialog user={u} />
                            <ResetPasswordButton email={u.email} userName={u.name} />
                            <DeleteUserButton userId={u.id} userName={u.name} />
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
