import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { COOKIE_SYNC_MOCK as MOCK } from "./mock";

export function V4ModalOps() {
  const route = MOCK.routes[0];
  return (
    <div className="cookie-dp v4">
      <div className="dp-hero">
        <div>
          <p className="dp-kicker">Modal-first CRUD</p>
          <h3>Clean table, actions in focused modals</h3>
          <p>Add/Edit/Delete and source setup move out of the table into a calm modal workflow.</p>
        </div>
        <button><Plus size={14} /> Add route</button>
      </div>
      <div className="dp-modal-layout">
        <div className="dp-list-card">
          {MOCK.routes.map((item) => (
            <div className="dp-list-row" key={item.domain}>
              <span>{item.domain}</span>
              <strong>{item.status}</strong>
              <Pencil size={14} />
            </div>
          ))}
        </div>
        <div className="dp-modal">
          <div className="dp-modal-head">
            <strong>Edit route</strong>
            <span>{route.domain}</span>
          </div>
          <label>Source browser<input value={MOCK.source.label} readOnly /></label>
          <label>Vault policy<input value="Only source can publish" readOnly /></label>
          <div className="dp-modal-actions">
            <button className="danger"><Trash2 size={13} /> Delete</button>
            <button><CheckCircle2 size={13} /> Save lock</button>
          </div>
        </div>
      </div>
    </div>
  );
}
