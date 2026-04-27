import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users } from 'lucide-react'
import { ChangeRoleButton } from './ChangeRoleButton'
import { formatDateTime } from '@/lib/utils'

const roleBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  admin: { label: 'Admin', variant: 'default' },
  staff: { label: 'Staff', variant: 'outline' },
  borrower: { label: 'Borrower', variant: 'secondary' },
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users } = await (supabase.from('users') as any)
    .select('id, name, email, role, phone, institution, class_division, created_at')
    .order('role')
    .order('name') as {
      data: Array<{
        id: string; name: string; email: string; role: string
        phone: string | null; institution: string; class_division: string; created_at: string
      }> | null
    }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengguna</h1>
        <p className="text-muted-foreground text-sm">Kelola akun dan peran pengguna sistem</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Semua Pengguna ({users?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Instansi / Kelas</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Belum ada pengguna
                  </TableCell>
                </TableRow>
              )}
              {users?.map((u) => {
                const rb = roleBadge[u.role]
                const isSelf = u.id === currentUser?.id
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.institution}
                      {u.class_division && <span className="block text-xs">{u.class_division}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{u.phone ?? '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(u.created_at)}
                    </TableCell>
                    <TableCell>
                      {isSelf
                        ? <Badge variant={rb?.variant}>{rb?.label ?? u.role}</Badge>
                        : <ChangeRoleButton userId={u.id} currentRole={u.role} />}
                    </TableCell>
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
