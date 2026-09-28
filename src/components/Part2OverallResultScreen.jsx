import { useEffect, useState } from 'react';
import { STYLE_LABEL, COURT_CLEAR_THRESHOLD, SQUAD_CLEAR_COUNT, statTotal } from '../game/data.js';

const REVEAL_INTERVAL_MS = 260;

export default function Part2OverallResultScreen({ state, onFinish }) {
  const squad = state.part2.squad;
  const byCourt = {};
  squad.forEach((m) => { (byCourt[m.courtRank] ||= []).push(m); });
  const courts = Object.keys(byCourt).map(Number).sort((a, b) => a - b);
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (revealCount >= courts.length) return undefined;
    const t = setTimeout(() => setRevealCount((c) => Math.min(c + 1, courts.length)), REVEAL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [revealCount, courts.length]);

  const done = revealCount >= courts.length;
  const clearedCount = state.part2.finalClearedCount;
  const cleared = clearedCount >= SQUAD_CLEAR_COUNT;

  return (
    <div className="card">
      <h2>第2部：全体結果</h2>
      <div className="sub" style={{ marginBottom: 10 }}>全{state.part2.simResult.totalMatches}試合を終えた、最終的なコート配置。</div>

      {courts.slice(0, revealCount).map((court) => (
        <div key={court} style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, color: court <= COURT_CLEAR_THRESHOLD ? '#ffe6a3' : '#9fd8b6' }}>
            {court}番コート {court <= COURT_CLEAR_THRESHOLD ? '（クリアゾーン）' : ''}（{byCourt[court].length}人）
          </h3>
          <div className="pair-select-grid">
            {byCourt[court].map((m) => (
              <div key={m.id} className="chip">
                <div className="chip-name">『{m.title}』{m.name}</div>
                <div className="chip-sub">{STYLE_LABEL[m.style]}／総合{statTotal(m)}／{m.part2Record.wins}勝{m.part2Record.losses}敗</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {done ? (
        <div className="action-footer">
          <div style={{ fontWeight: 'bold', color: cleared ? '#ffe6a3' : '#9fd8b6', marginBottom: 8 }}>
            5番コート以内 {clearedCount}/{SQUAD_CLEAR_COUNT}人 — {cleared ? 'クリア達成！' : '届かず'}
          </div>
          <button className="primary" onClick={onFinish}>結果を確定する</button>
        </div>
      ) : (
        <div className="action-footer"><button onClick={() => setRevealCount(courts.length)}>スキップ</button></div>
      )}
    </div>
  );
}
