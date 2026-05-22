import { redirect } from 'next/navigation'

// Route ini sudah deprecated — gunakan /admin/equipment
export default function AssetsPage() {
  redirect('/admin/equipment')
}
