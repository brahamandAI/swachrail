export function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Choose a photo.'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const max = 1280
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that photo.'))
    }
    img.src = url
  })
}

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
