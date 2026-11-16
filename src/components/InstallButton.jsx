import { useEffect, useState } from 'react'

function isIos() {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [toast, setToast] = useState('')

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault()
      setPromptEvent(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
      setToast('Installed. Open SwachhRail from your home screen.')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(''), 7000)
    return () => window.clearTimeout(id)
  }, [toast])

  if (installed) return null

  const install = async () => {
    if (promptEvent) {
      promptEvent.prompt()
      const choice = await promptEvent.userChoice
      setPromptEvent(null)
      if (choice.outcome === 'accepted') {
        setToast('Installing. SwachhRail will appear on your home screen.')
      }
      return
    }
    if (isIos()) {
      setToast('On iPhone: tap Share, then Add to Home Screen. SwachhRail will appear on your home screen.')
      return
    }
    setToast('In Chrome, tap the menu (three dots) and choose Install app. SwachhRail will appear on your home screen.')
  }

  return (
    <>
      <button className="btn install" type="button" onClick={install}>
        <svg className="dl-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="7" y="2" width="10" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M11 18h2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        Install
      </button>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
