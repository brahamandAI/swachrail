import trainArt from '../assets/bg.jpg'

export default function RailBg({ tone = 'light' }) {
  return (
    <div className={`rail-bg rail-bg-${tone}`} aria-hidden="true">
      <img className="rail-bg-art" src={trainArt} alt="" />
      <div className="rail-bg-wash" />
      <div className="rail-bg-tracks" />
    </div>
  )
}
