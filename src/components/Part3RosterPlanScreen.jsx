import { useState } from 'react';
import { WORLD_STAGE_LABEL } from '../game/data.js';
import { SCHOOL_LABEL } from '../game/schools.js';

const SLOTS = [
  { key: 's1', label: 'S1', group: 'singles' },
  { key: 's2', label: 'S2', group: 'singles' },
  { key: 's3', label: 'S3', group: 'singles' },
  { key: 's4', label: 'S4', group: 'singles' },
  { key: 'd1a', label: 'D1（1人目）', group: 'd1' },
  { key: 'd1b', label: 'D1（2人目）', group: 'd1' },
  { key: 'd2a', label: 'D2（1人目）', group: 'd2' },
  { key: 'd2b', label: 'D2（2人目）', group: 'd2' },
];

function emptyAssign() { return { s1: '', s2: '', s3: '', s4: '', d1a: '', d1b: '', d2a: '', d2b: '' }; }

export default function Part3RosterPlanScreen({ state, onConfirm }) {
  const p3 = state.part3;
  const isLeague = p3.stage === 'league1' || p3.stage === 'league2';
  const roundCount = isLeague ? 3 : 1;
  const players = p3.squad.filter((m) => !m.part3Withdrawn);
  const injuredCount = p3.squad.length - players.length;
  const [assigns, setAssigns] = useState(() => Array.from({ length: roundCount }, emptyAssign));
  const [roundTab, setRoundTab] = useState(0);
  const activeRound = isLeague ? roundTab : 0;

  function usedElsewhere(roundIdx, slotKey) {
    const used = new Set();
    assigns.forEach((a, ri) => {
      Object.entries(a).forEach(([k, v]) => {
        if (!v) return;
        if (isLeague ? (ri !== roundIdx || k !== slotKey) : k !== slotKey) used.add(v);
      });
    });
    return used;
  }

  function optionsFor(roundIdx, slotKey) {
    const used = usedElsewhere(roundIdx, slotKey);
    return players.filter((p) => !used.has(p.id));
  }

  function setSlot(roundIdx, slotKey, value) {
    setAssigns((prev) => prev.map((a, i) => (i === roundIdx ? { ...a, [slotKey]: value } : a)));
  }

  function roundReady(a) {
    const vals = Object.values(a);
    return vals.every(Boolean) && new Set(vals).size === vals.length;
  }
  const allReady = assigns.every(roundReady);

  function handleConfirm() {
    const plans = assigns.map((a) => ({
      s1: a.s1, s2: a.s2, s3: a.s3, s4: a.s4, d1: [a.d1a, a.d1b], d2: [a.d2a, a.d2b],
    }));
    onConfirm(plans);
  }

  return (
    <div className="card">
      <h2>{WORLD_STAGE_LABEL[p3.stage]}：出場ロースター編成</h2>
      <div className="sub" style={{ marginBottom: 10 }}>
        {isLeague
          ? '3試合それぞれに8人（S1〜S4・D1・D2）を選ぶ。3試合の間で選手は重複できない。1次・2次リーグの試合中に負傷はしない。'
          : '準々決勝・準決勝・決勝で使い回す8人を選ぶ（この3試合は同じ顔ぶれの重複可）。'}
      </div>
      {p3.stage === 'quarter' && (
        <div className="sub" style={{ marginBottom: 10, color: injuredCount ? '#ff8a80' : '#9fd8b6' }}>
          {injuredCount > 0
            ? `準々決勝を前に${injuredCount}人が負傷し、選抜できなくなった。`
            : 'リーグ戦の疲労による負傷者は出なかった。'}
        </div>
      )}
      <div className="sub" style={{ marginBottom: 10, color: '#9fd8b6' }}>候補者：{players.length}人</div>

      {isLeague && (
        <div className="segmented" style={{ marginBottom: 10 }}>
          {[0, 1, 2].map((i) => (
            <button key={i} className={roundTab === i ? 'primary' : ''} onClick={() => setRoundTab(i)}>
              第{i + 1}試合 {roundReady(assigns[i]) ? '✓' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="lineup-grid">
        {['singles', 'd1', 'd2'].map((group) => (
          <div key={group} className="lineup-group">
            {SLOTS.filter((s) => s.group === group).map((slot) => (
              <div key={slot.key} className="lineup-slot">
                <div className="lineup-slot-label">{slot.label}</div>
                <select value={assigns[activeRound][slot.key]} onChange={(e) => setSlot(activeRound, slot.key, e.target.value)}>
                  <option value="">未選択</option>
                  {optionsFor(activeRound, slot.key).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}（{SCHOOL_LABEL[p.school] || '不明'}出身）</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="action-footer">
        <button className="primary" disabled={!allReady} onClick={handleConfirm}>
          この編成で{WORLD_STAGE_LABEL[p3.stage]}へ出発する
        </button>
      </div>
    </div>
  );
}
