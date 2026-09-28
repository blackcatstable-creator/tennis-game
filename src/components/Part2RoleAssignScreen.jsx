import { useState } from 'react';
import { STYLE_LABEL, statTotal, computePart2Roles, computePart2SinglesCount } from '../game/data.js';
import { SCHOOL_LABEL } from '../game/schools.js';

export default function Part2RoleAssignScreen({ state, onStart }) {
  const squad = state.part2.squad;
  const byId = new Map(squad.map((p) => [p.id, p]));
  const initialRoles = state.part2.roles;
  const recommendedMin = Math.ceil(squad.length * (2 / 3));
  const recommendedMax = computePart2SinglesCount(squad.length) >= recommendedMin
    ? Math.floor(squad.length * (3 / 4))
    : squad.length;

  const [singlesIds, setSinglesIds] = useState(() => [...initialRoles.singles]);
  const [doublesIds, setDoublesIds] = useState(() => new Set(initialRoles.doubles.flat()));
  const [pairs, setPairs] = useState(() => initialRoles.doubles.map((p) => [...p]));
  const [selectedId, setSelectedId] = useState(null);

  const pairedIds = new Set(pairs.flat());
  const singles = singlesIds.map((id) => byId.get(id)).filter(Boolean);
  const unpairedDoubles = [...doublesIds].filter((id) => !pairedIds.has(id)).map((id) => byId.get(id)).filter(Boolean);
  const doublesPairs = pairs.map(([a, b]) => [byId.get(a), byId.get(b)]).filter(([a, b]) => a && b);

  function moveToDoubles(id) {
    setSinglesIds((prev) => prev.filter((x) => x !== id));
    setDoublesIds((prev) => new Set(prev).add(id));
    if (selectedId === id) setSelectedId(null);
  }

  function moveToSingles(id) {
    setPairs((prev) => prev.filter((pr) => !pr.includes(id)));
    setDoublesIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setSinglesIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (selectedId === id) setSelectedId(null);
  }

  function onDoublesChipClick(id) {
    if (selectedId === id) { setSelectedId(null); return; }
    if (selectedId === null) { setSelectedId(id); return; }
    setPairs((prev) => [...prev, [selectedId, id]]);
    setSelectedId(null);
  }

  function removePair(idx) {
    setPairs((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetToAuto() {
    const roles = computePart2Roles(squad);
    setSinglesIds([...roles.singles]);
    setDoublesIds(new Set(roles.doubles.flat()));
    setPairs(roles.doubles.map((p) => [...p]));
    setSelectedId(null);
  }

  const ready = unpairedDoubles.length === 0;

  function handleStart() {
    onStart({ singles: singlesIds, doubles: pairs });
  }

  return (
    <div className="card">
      <h2>第2部：出場編成（手動振り分け）</h2>
      <div className="sub" style={{ marginBottom: 10 }}>
        遠征メンバー{squad.length}人をシングルス・ダブルスに自分で振り分け、ダブルスは自分でペアを組む。
        誰を主力（シングルス）に磨き、誰をダブルスに回し、誰を捨てコマにするかはここでの選択次第。
        推奨シングルス人数の目安は{recommendedMin}〜{recommendedMax}人だが、必須ではない。
        この編成は今回の挑戦を通して固定され、挑戦は1本50ターン固定・全員一斉の一発勝負として決着する。
      </div>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>シングルス（{singles.length}人）</h3>
      <div className="pair-select-grid" style={{ marginBottom: 14 }}>
        {singles.map((p) => (
          <button key={p.id} className="chip" onClick={() => moveToDoubles(p.id)} title="クリックでダブルスへ移動">
            <div className="chip-name">『{p.title}』{p.name}</div>
            <div className="chip-sub">{SCHOOL_LABEL[p.school] || '不明'}出身／{STYLE_LABEL[p.style]}／総合{statTotal(p)}</div>
          </button>
        ))}
        {singles.length === 0 && <div className="sub">シングルス出場者はいない。</div>}
      </div>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>
        ダブルス・未ペア（{unpairedDoubles.length}人） {selectedId && doublesIds.has(selectedId) ? `／ ${byId.get(selectedId)?.name} の相手を選択中` : ''}
      </h3>
      <div className="pair-select-grid" style={{ marginBottom: 6 }}>
        {unpairedDoubles.map((p) => (
          <div key={p.id} className={`chip ${selectedId === p.id ? 'selected' : ''}`} style={{ cursor: 'pointer' }} onClick={() => onDoublesChipClick(p.id)}>
            <div className="chip-name">『{p.title}』{p.name}</div>
            <div className="chip-sub">{SCHOOL_LABEL[p.school] || '不明'}出身／{STYLE_LABEL[p.style]}／総合{statTotal(p)}</div>
            <button onClick={(e) => { e.stopPropagation(); moveToSingles(p.id); }} style={{ marginTop: 4 }}>シングルスへ</button>
          </div>
        ))}
      </div>
      <div className="sub" style={{ marginBottom: 14 }}>2人クリックするとダブルスペアになる。</div>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>ダブルス組み合わせ（{doublesPairs.length}組）</h3>
      <div className="select-list" style={{ marginBottom: 14 }}>
        {doublesPairs.map(([a, b], i) => (
          <div key={i} className="select-item">
            <div>{a.name} ・ {b.name}</div>
            <div style={{ fontSize: 12, color: '#9fd8b6' }}>ペア総合値 {statTotal(a) + statTotal(b)}</div>
            <button onClick={() => removePair(i)}>解除</button>
          </div>
        ))}
        {doublesPairs.length === 0 && <div className="sub">まだ組み合わせがありません。</div>}
      </div>

      <div className="action-footer">
        <button onClick={resetToAuto}>自動振り分けに戻す</button>
        <button className="primary" disabled={!ready} onClick={handleStart}>
          {ready ? 'この編成で挑戦を開始する' : `あと${unpairedDoubles.length}人のペアを決めてください`}
        </button>
      </div>
    </div>
  );
}
