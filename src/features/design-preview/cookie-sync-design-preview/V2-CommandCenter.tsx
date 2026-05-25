import { Bot, CloudDownload, RadioTower, ShieldCheck } from "lucide-react";
import { COOKIE_SYNC_MOCK as MOCK } from "./mock";

export function V2CommandCenter() {
  return (
    <div className="cookie-dp v2">
      <div className="dp-command-hero">
        <ShieldCheck size={32} />
        <div>
          <p className="dp-kicker">Operator view</p>
          <h3>Source command center</h3>
          <p>Large status bands make it obvious which browser can publish and which profiles only load.</p>
        </div>
      </div>
      <div className="dp-command-grid">
        <section className="dp-command-source">
          <Bot size={18} />
          <span>Main source</span>
          <strong>{MOCK.source.label}</strong>
          <small>{MOCK.source.facebookCookies} Facebook cookies · ext {MOCK.source.version}</small>
        </section>
        {MOCK.targets.map((target) => (
          <section className="dp-command-target" key={target.browserId}>
            <RadioTower size={18} />
            <span>{target.state}</span>
            <strong>{target.label}</strong>
            <small>{target.cookies} cookies · load {target.lastLoad}</small>
          </section>
        ))}
      </div>
      <div className="dp-command-actions">
        {MOCK.commands.map((cmd) => (
          <button key={cmd.label} className={`dp-action ${cmd.tone}`}>
            <CloudDownload size={14} />
            <strong>{cmd.label}</strong>
            <span>{cmd.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
