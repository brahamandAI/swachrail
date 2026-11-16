export function maskPnr(pnr) {
  const digits = String(pnr || '').replace(/\D/g, '')
  if (digits.length < 4) return ''
  return `••••••${digits.slice(-4)}`
}

export function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 4) return ''
  return `${digits.slice(0, 2)}••••${digits.slice(-2)}`
}
