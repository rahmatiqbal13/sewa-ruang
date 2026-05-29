import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ type?: string; id?: string }>
}

export default async function AdminScanRedirect({ searchParams }: Props) {
  const { type, id } = await searchParams

  if (type && id) {
    redirect(`/scan?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`)
  }

  redirect('/scan')
}
