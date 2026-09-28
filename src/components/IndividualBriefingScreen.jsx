import { useState } from 'react';
import { STYLE_LABEL, statTotal, TOURNAMENT_STAGES, getAffinity, recommendPartners } from '../game/data.js';

export default function IndividualBriefingScreen({ state, onBegin }) {
  const seasonLabel = state.pendingSeason === 'summer' ? '夏' : '冬';
  const stage = TOURNAMENT_STAGES[state.teamStageIndex];
  const eligible = state.team.filter((p) => !p.injured);
  const injuredCount = state.team.length - eligible.length;
  const sorted = [...eligible].sort((a, b) => a.rank - b.rank);
  const numPairs = Math.floor(sorted.length / 2);

  const [pairs, setPairs] = useState(() => (
    Array.from({ length: numPairs }, (_, i) => [sorted[i * 2].id, sorted[i * 2 + 1].id])
  ));

  function usedElsewhere(slotIdx, side) {
    const used = new Set();
    pairs.forEach((pair, i) => {
      pair.forEach((id, s) => {
        if (i === slotIdx && s === side) return;
        if (id) used.add(id);
      });
    });
    return used;
  }

  function optionsFor(slotIdx, side) {
    const used = usedElsewhere(slotIdx, side);
    return sorted.filter((p) => !used.has(p.id));
  }

  function setSlot(slotIdx, side, value) {
    setPairs((prev) => prev.map((pair, i) => {
      if (i !== slotIdx) return pair;
      const next = [...pair];
      next[side] = value;
      return next;
    }));
  }

  function recommendationFor(slotIdx, side) {
    const otherSide = side === 0 ? 1 : 0;
    const pair = pairs[slotIdx];
    const selectedId = pair[otherSide];
    if (!selectedId || pair[side]) return null;
    const selected = sorted.find((p) => p.id === selectedId);
    if (!selected) return null;
    const candidates = optionsFor(slotIdx, side);
    return recommendPartners(selected, candidates).slice(0, 3);
  }

  const usedIds = new Set(pairs.flat().filter(Boolean));
  const bye = sorted.filter((p) => !usedIds.has(p.id));
  const ready = pairs.every(([a, b]) => a && b);

  function handleBegin() {
    onBegin(pairs);
  }

  return (
    <div className="card">
      <h2>個人戦：{seasonLabel}の{stage.label}</h2>
      <div className="sub" style={{ marginBottom: 10 }}>
        シングルス・ダブルスともに、原則として部員全員が{stage.label}から出場する。以降は勝った選手（ペア）だけが同ステージ内の次ラウンドへ勝ち上がる。
        ダブルスの出場ペアは下で自由に組み替えられる。
      </div>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>シングルス出場（{sorted.length}人）</h3>
      <div className="pair-select-grid" style={{ marginBottom: 14 }}>
        {sorted.map((p) => (
          <div key={p.id} className="chip">
            <div className="chip-name">{p.name}</div>
            <div className="chip-sub">序列{p.rank}／{STYLE_LABEL[p.style]}／総合{statTotal(p)}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>ダブルス出場ペア（{numPairs}組）</h3>
      <div className="lineup-grid">
        {pairs.map((pair, i) => {
          const bothFilled = pair[0] && pair[1];
          const a = bothFilled ? sorted.find((p) => p.id === pair[0]) : null;
          const b = bothFilled ? sorted.find((p) => p.id === pair[1]) : null;
          const affinity = a && b ? getAffinity(a, b) : null;
          return (
            <div key={i} className="lineup-group">
              <div className="lineup-slot-label">ダブルス{i + 1}</div>
              {[0, 1].map((side) => (
                <div key={side} className="lineup-slot">
                  <select value={pair[side]} onChange={(e) => setSlot(i, side, e.target.value)}>
                    <option value="">未選択</option>
                    {optionsFor(i, side).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {recommendationFor(i, side) && (
                    <div className="affinity-list" style={{ marginTop: 4 }}>
                      {recommendationFor(i, side).map(({ player: cand, affinity: aff }, j) => (
                        <div className="affinity-row" key={cand.id}>
                          <div className="affinity-name">{j === 0 ? <span className="tag saved">推奨</span> : null}{cand.name}</div>
                          <div className="affinity-reason">{aff.reason}</div>
                          <div className="affinity-score">{aff.score}（{aff.label}）</div>
                          <button onClick={() => setSlot(i, side, cand.id)}>採用</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {affinity && (
                <div className="sub" style={{ fontSize: 11 }}>
                  相性：{affinity.label}（{affinity.reason}）
                </div>
              )}
            </div>
          );
        })}
        {numPairs === 0 && <div className="sub">組めるペアがいない。</div>}
      </div>
      {bye.length > 0 && (
        <div className="sub" style={{ marginTop: 6 }}>
          あまり（今大会ダブルス不出場）：{bye.map((p) => p.name).join('、')}
        </div>
      )}
      {injuredCount > 0 && (
        <div className="sub" style={{ marginTop: 6, color: '#ff8a80' }}>怪我療養中のため不出場：{injuredCount}人</div>
      )}

      <div className="action-footer">
        <button className="primary" disabled={!ready} onClick={handleBegin}>個人戦を開始する</button>
      </div>
    </div>
  );
}
