export async function placeNameFromCoords(lat, lng) {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return ''
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    const res = await fetch(url)
    if (!res.ok) return ''
    const data = await res.json()
    const locality = data.locality || data.city || data.localityInfo?.administrative?.[0]?.name || ''
    const area = data.principalSubdivision || data.countryName || ''
    const name = [locality, area].filter(Boolean).join(', ')
    return name || data.plusCode || ''
  } catch {
    return ''
  }
}

export async function readLivePlace() {
  const coords = await new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This phone cannot share live location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: +pos.coords.latitude.toFixed(5),
        lng: +pos.coords.longitude.toFixed(5),
      }),
      () => reject(new Error('Allow location, then try again.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
  const placeName = await placeNameFromCoords(coords.lat, coords.lng)
  return { ...coords, placeName: placeName || 'Location captured' }
}
