import content from '../about/eden-content.json';

function Pillar({ title, bullets }) {
  return (
    <div className="card radius-xl">
      <h3>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {bullets.map((b, i) => <li key={i} style={{ lineHeight: 1.6 }}>{b}</li>)}
      </ul>
    </div>
  );
}

function CompareTable({ rows, left, right }) {
  return (
    <div className="card radius-xl">
      <h3>{content.compare.title}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr className="muted">
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>Capability</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>{left}</th>
              <th style={{ textAlign: 'left', padding: '8px 12px' }}>{right}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([cap, a, b], i) => (
              <tr key={i} style={{ background: 'var(--panel)', borderRadius: '12px' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{cap}</td>
                <td style={{ padding: '10px 12px' }}>{a}</td>
                <td style={{ padding: '10px 12px' }}>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AboutEden() {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>{content.headline}</h1>
      <p className="muted">{content.subhead}</p>

      <section className="grid-auto" style={{ marginTop: '16px' }}>
        {content.pillars.map((p, i) => <Pillar key={i} {...p} />)}
      </section>

      <section className="card radius-xl" style={{ marginTop: '20px' }}>
        <h3>{content.workflow.title}</h3>
        <ol style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {content.workflow.steps.map((s, i) => <li key={i} style={{ lineHeight: 1.8 }}>{s}</li>)}
        </ol>
      </section>

      <section style={{ marginTop: '20px' }}>
        <CompareTable rows={content.compare.rows} left={content.compare.left} right={content.compare.right} />
      </section>
    </div>
  );
}
