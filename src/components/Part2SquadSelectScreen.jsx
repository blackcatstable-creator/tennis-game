import { useState, useMemo } from 'react';
import { STYLE_LABEL, statTotal, SQUAD_MIN, SQUAD_MAX } from '../game/data.js';
import { SCHOOL_LABEL } from '../game/schools.js';

export default function Part2SquadSelectScreen({ state, onConfirm }) {
  const [restrictSchool, setRestrictSchool] = useState(false);
  const [restrictSchoolId, setRestrictSchoolId] = useState('');

  const schoolOptions = useMemo(() => {
    const ids = [...new Set(state.vault.map((p) => p.school))];
    return ids.sort((a, b) => (SCHOOL_LABEL[a] || '').localeCompare(SCHOOL_LABEL[b] || '', 'ja'));
  }, [state.vault]);

  const pool = restrictSchool && restrictSchoolId
    ? state.vault.filter((p) => p.school === restrictSchoolId)
    : state.vault;
  const sorted = [...pool].sort((a, b) => statTotal(b) - statTotal(a));
  const [selected, setSelected] = useState(() => new Set(sorted.slice(0, Math.min(SQUAD_MIN, sorted.length)).map((p) => p.id)));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < SQUAD_MAX) next.add(id);
      return next;
    });
  }

  function selectTop(n) {
    setSelected(new Set(sorted.slice(0, Math.min(n, sorted.length)).map((p) => p.id)));
  }

  function toggleRestrict() {
    setRestrictSchool((prev) => !prev);
    setSelected(new Set());
  }

  function changeRestrictSchool(id) {
    setRestrictSchoolId(id);
    setSelected(new Set());
  }

  const ready = selected.size >= SQUAD_MIN && selected.size <= SQUAD_MAX;

  return (
    <div className="card">
      <h2>第2部：高校挑戦編 — 遠征メンバー選抜</h2>
      <div className="sub" style={{ marginBottom: 10 }}>
        保存庫（{state.vault.length}人・全中学で共有）から{SQUAD_MIN}〜{SQUAD_MAX}人を選び、1つの遠征チームを編成する。全員20番コートから開始し、
        5番コート以内に{SQUAD_MIN}人到達がクリア条件。少人数編成ほど全員を上位に押し上げる必要があり、多人数編成ほど層の厚さで狙いやすくなる。
      </div>

      <div className="sub" style={{ marginBottom: 10, padding: 8, border: '1px dashed var(--border, #888)', borderRadius: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={restrictSchool} onChange={toggleRestrict} />
          縛りプレイ：特定の中学出身者のみで編成する
        </label>
        {restrictSchool && (
          <div style={{ marginTop: 8 }}>
            <select value={restrictSchoolId} onChange={(e) => changeRestrictSchool(e.target.value)}>
              <option value="">中学を選択してください</option>
              {schoolOptions.map((id) => (
                <option key={id} value={id}>{SCHOOL_LABEL[id] || '不明'}（{state.vault.filter((p) => p.school === id).length}人）</option>
              ))}
            </select>
          </div>
        )}
        {restrictSchool && restrictSchoolId && pool.length < SQUAD_MIN && (
          <div className="sub" style={{ marginTop: 6, color: 'var(--danger, #c0392b)' }}>
            {SCHOOL_LABEL[restrictSchoolId]}出身の保存選手が{pool.length}人しかいません（最低{SQUAD_MIN}人必要）。この縛りでは編成できません。
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button onClick={() => selectTop(SQUAD_MIN)}>総合値上位{SQUAD_MIN}人を選択</button>
        <button onClick={() => selectTop(SQUAD_MAX)}>総合値上位{SQUAD_MAX}人を選択</button>
        <button onClick={() => setSelected(new Set())}>選択をクリア</button>
      </div>

      <div className="pair-select-grid">
        {sorted.map((p) => (
          <button
            key={p.id}
            className={`chip ${selected.has(p.id) ? 'selected' : ''}`}
            onClick={() => toggle(p.id)}
          >
            <div className="chip-name">『{p.title}』{p.name}</div>
            <div className="chip-sub">{SCHOOL_LABEL[p.school] || '不明'}出身／{STYLE_LABEL[p.style]}／総合{statTotal(p)}／技{p.skills.length}/4</div>
          </button>
        ))}
      </div>

      <div className="action-footer">
        <div className="sub action-footer-note">選抜中：{selected.size}人{ready ? '' : `（${SQUAD_MIN}〜${SQUAD_MAX}人にしてください）`}</div>
        <button className="primary" disabled={!ready} onClick={() => onConfirm([...selected])}>この{selected.size}人で遠征を開始する</button>
      </div>
    </div>
  );
}
