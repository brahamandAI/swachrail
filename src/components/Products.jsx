export default function Products() {
  return (
    <section id="prod">
      <h2>Record types</h2>
      <div className="grid">
        <a className="card link-card" href="#attend">
          <div className="k">Attendance</div>
          <p>Mark staff present for this duty date.</p>
        </a>
        <a className="card link-card" href="#photo">
          <div className="k">Cleanliness photos</div>
          <p>Attach a coach photo and a short audit note.</p>
        </a>
        <a className="card link-card" href="#fb" style={{ borderColor: 'var(--c)' }}>
          <div className="k">SwachhRail Feedback</div>
          <p>Save a passenger cleanliness comment for this date.</p>
        </a>
      </div>
    </section>
  )
}
