import { createClient, createAdminDbClient } from '@/lib/supabase/server'
import { Users, ShieldCheck } from 'lucide-react'
import { ChangeRoleButton } from './ChangeRoleButton'
import { EditUserDialog } from './EditUserDialog'
import { DeleteUserButton } from './DeleteUserButton'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { AddUserDialog } from './AddUserDialog'
import { UserDetailSheet } from './UserDetailSheet'
import { formatDateTime, cn } from '@/lib/utils'

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-purple-100 text-purple-800 border border-purple-200' },
  admin:       { label: 'Admin',       className: 'bg-blue-100 text-blue-800 border border-blue-200' },
  staff:       { label: 'Staff',       className: 'bg-muted text-muted-foreground border border-border' },
  borrower:    { label: 'Peminjam',    className: 'bg-green-100 text-green-800 border border-green-200' },
}

export default async function UsersPage() {
  const supabase = await createClient()
  const sb = createAdminDbClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: users } = await sb
    .from('users')
    .select('id, name, email, role, phone, institution, class_division, identity_number, telegram_username, plain_password, created_at')
    .order('role')
    .order('name') as {
      data: Array<{
        id: string; name: string; email: string; role: string
        phone: string | null; institution: string | null; class_division: string | null
        identity_number: string | null; telegram_username: string | null
        plain_password: string | null; created_at: string
      }> | null
    }

  const totalByRole = {
    admin: users?.filter(u => ['super_admin', 'admin', 'staff'].includes(u.role)).length ?? 0,
    borrower: users?.filter(u => u.role === 'borrower').length ?? 0,
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Pengguna <ShieldCheck className="h-4 w-4 text-purple-500" />
          </h1>
          <p className="page-subtitle">Kelola semua akun — Super Admin mode aktif</p>
        </div>
        <AddUserDialog />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="mini-stat border-t-indigo-400">
          <p className="mini-stat-label">Total Pengguna</p>
          <p className="mini-stat-value">{users?.length ?? 0}</p>
        </div>
        <div className="mini-stat border-t-purple-400">
          <p className="mini-stat-label">Admin & Staff</p>
          <p className="mini-stat-value">{totalByRole.admin}</p>
        </div>
        <div className="mini-stat border-t-emerald-400">
          <p className="mini-stat-label">Peminjam</p>
          <p className="mini-stat-value">{totalByRole.borrower}</p>
        </div>
      </div>

      <div className="bg-card rounded-[14px] border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground/70" />
          <p className="text-sm font-semibold text-foreground/80">Semua Pengguna ({users?.length ?? 0})</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th>Instansi / Kelas</th>
                <th>No. Identitas</th>
                <th>Telegram</th>
                <th>Terdaftar</th>
                <th>Role</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users?.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground/70 py-10 text-sm">Belum ada pengguna</td>
                </tr>
              )}
              {users?.map((u) => {
                const badge = ROLE_BADGE[u.role]
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id}>
                    <td className="font-medium whitespace-nowrap text-sm">
                      {u.name}
                      {isSelf && <span className="ml-1.5 text-[10px] text-muted-foreground/70">(Anda)</span>}
                    </td>
                    <td className="text-xs text-muted-foreground">{u.email}</td>
                    <td className="text-xs">{u.phone ?? <span className="text-muted-foreground/30">-</span>}</td>
                    <td className="text-xs text-muted-foreground">
                      {u.institution ?? '-'}
                      {u.class_division && <span className="block text-[10px]">{u.class_division}</span>}
                    </td>
                    <td className="text-xs font-mono">{u.identity_number ?? <span className="text-muted-foreground/30">-</span>}</td>
                    <td className="text-xs">{u.telegram_username ?? <span className="text-muted-foreground/30">-</span>}</td>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(u.created_at)}</td>
                    <td>
                      {isSelf ? (
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', badge?.className)}>
                          {badge?.label ?? u.role}
                        </span>
                      ) : (
                        <ChangeRoleButton userId={u.id} currentRole={u.role} isSuperAdmin={true} />
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <UserDetailSheet user={u} />
                        {!isSelf && (
                          <>
                            <EditUserDialog user={u} />
                            <ChangePasswordDialog userId={u.id} userName={u.name} plainPassword={u.plain_password} />
                            <DeleteUserButton userId={u.id} userName={u.name} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
