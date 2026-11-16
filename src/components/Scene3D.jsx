import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function Scene3D() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true })
    R.setClearColor(0x000000, 0)
    R.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const S = new THREE.Scene()
    const C = new THREE.PerspectiveCamera(55, 1, 0.1, 200)
    C.position.set(0, 2.3, 11)
    S.add(new THREE.AmbientLight(0x6688aa, 0.8))
    const L = new THREE.PointLight(0x19e6ff, 2, 40)
    L.position.set(0, 5, 5)
    S.add(L)
    const T = new THREE.Group()
    S.add(T)

    const white = new THREE.MeshStandardMaterial({ color: 0xf2f8ff, metalness: 0.6, roughness: 0.25 })
    const glow = new THREE.MeshBasicMaterial({ color: 0x19e6ff })
    const holo = new THREE.MeshBasicMaterial({ color: 0x19e6ff, wireframe: true, transparent: true, opacity: 0.28 })
    const add = (g, m, x, y, z, rx, ry, rz) => {
      const a = new THREE.Mesh(g, m)
      a.position.set(x, y, z)
      a.rotation.set(rx || 0, ry || 0, rz || 0)
      T.add(a)
      return a
    }

    for (let i = 0; i < 4; i++) {
      const z = -i * 3.1
      const b = add(new THREE.CylinderGeometry(0.85, 0.85, 3, 24), white, 0, 1.1, z, Math.PI / 2)
      b.scale.set(1, 1, 0.9)
      add(new THREE.CylinderGeometry(0.86, 0.86, 3.02, 24), holo, 0, 1.1, z, Math.PI / 2).scale.set(1.04, 1.04, 0.94)
      add(new THREE.BoxGeometry(1.75, 0.07, 2.6), glow, 0, 1.3, z)
      for (let j = 0; j < 4; j++)
        add(new THREE.BoxGeometry(0.05, 0.3, 0.45), new THREE.MeshBasicMaterial({ color: 0x8fe8ff }), 0.87, 1.45, z - 1 + j * 0.6)
      add(new THREE.BoxGeometry(1.4, 0.25, 2.4), new THREE.MeshStandardMaterial({ color: 0x101a2a }), 0, 0.2, z)
    }
    const nose = add(new THREE.SphereGeometry(0.85, 24, 16), white, 0, 1.1, 3.2)
    nose.scale.set(0.9, 0.85, 2.2)
    add(new THREE.SphereGeometry(0.87, 16, 10), holo, 0, 1.1, 3.2).scale.set(0.92, 0.87, 2.25)
    add(new THREE.BoxGeometry(1.1, 0.35, 0.5), new THREE.MeshBasicMaterial({ color: 0x0a5a88 }), 0, 1.5, 4.4).rotation.x = -0.5
    add(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.4, 0.95, 5)
    add(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), -0.4, 0.95, 5)
    T.position.set(0, 0, 0)
    T.rotation.set(0, 0, 0)

    const grid = new THREE.GridHelper(90, 36, 0x19e6ff, 0x19e6ff)
    grid.position.y = -0.05
    grid.material.transparent = true
    grid.material.opacity = 0.28
    S.add(grid)

    const sl = []
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.25), new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.35 }))
      s.position.set(0, 0, i * 2 - 60)
      S.add(s)
      sl.push(s)
    }
    ;[-1, 1].forEach((x) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 80), new THREE.MeshBasicMaterial({ color: 0x19e6ff, transparent: true, opacity: 0.45 }))
      r.position.set(x * 0.8, 0.03, 0)
      S.add(r)
    })

    const rings = []
    for (let i = 0; i < 3; i++) {
      const rg = new THREE.Mesh(
        new THREE.TorusGeometry(3 + i * 0.7, 0.02, 8, 80),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xb36bff : 0x19e6ff, transparent: true, opacity: 0.6 })
      )
      rg.rotation.x = Math.PI / 2
      rg.position.y = 0.1 + i * 0.05
      S.add(rg)
      rings.push(rg)
    }

    const pg = new THREE.BufferGeometry()
    const pa = []
    for (let i = 0; i < 700; i++) pa.push((Math.random() - 0.5) * 60, Math.random() * 18, (Math.random() - 0.5) * 60)
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3))
    const P = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7fe9ff, size: 0.045, transparent: true, opacity: 0.35 }))
    S.add(P)

    let mx = 0
    let my = 0
    const onMove = (e) => {
      mx = e.clientX / window.innerWidth - 0.5
      my = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('pointermove', onMove)

    const rs = () => {
      R.setSize(window.innerWidth, window.innerHeight, false)
      C.aspect = window.innerWidth / window.innerHeight
      C.position.x = 0
      C.position.z = window.innerWidth < 700 ? 14 : 12
      C.updateProjectionMatrix()
    }
    window.addEventListener('resize', rs)
    rs()

    const clk = new THREE.Clock()
    let raf
    let prev = 0
    let travel = -18
    const loop = () => {
      const t = clk.getElapsedTime()
      const dt = Math.min(t - prev, 0.05)
      prev = t
      sl.forEach((s) => {
        s.position.z += 0.35
        if (s.position.z > 20) s.position.z -= 80
      })
      travel += dt * 5
      if (travel > -1) travel = -18
      T.position.x = 0
      T.position.z = travel
      T.position.y = Math.sin(t * 2) * 0.04
      T.rotation.set(0, 0, 0)
      rings.forEach((r, i) => {
        r.rotation.z = t * (i + 1) * 0.4
        r.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.05)
      })
      P.rotation.y = t * 0.02
      L.intensity = 2 + Math.sin(t * 3) * 0.6
      C.position.x = 0
      C.position.y = 2.3 - my * 0.3 + Math.min(window.scrollY, 600) * 0.004
      C.lookAt(0, 1.05, travel)
      holo.opacity = 0.2 + Math.abs(Math.sin(t * 1.5)) * 0.2
      R.render(S, C)
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', rs)
      S.traverse((o) => {
        if (o.geometry) o.geometry.dispose()
        if (o.material) o.material.dispose()
      })
      R.dispose()
    }
  }, [])

  return <canvas id="bg" ref={ref} />
}
