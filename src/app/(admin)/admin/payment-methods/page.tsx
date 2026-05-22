import { redirect } from 'next/navigation'

export default function PaymentMethodsRedirect() {
  redirect('/admin/payments?tab=metode')
}
