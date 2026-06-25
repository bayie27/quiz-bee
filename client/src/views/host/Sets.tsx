import { Link } from 'react-router-dom';

export default function Sets() {
  return (
    <main className="host-shell">
      <nav className="host-nav"><div className="brand-lockup">JPCS Quiz Game Host</div><Link className="bau-button ghost" to="/host">Dashboard</Link></nav>
      <section className="host-main"><div className="bau-card"><h1 className="bau-title-md">Question Sets</h1><p className="text-muted">Use the editor to manage question sets for this MVP.</p></div></section>
    </main>
  );
}
