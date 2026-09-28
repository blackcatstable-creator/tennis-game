import { useEffect, useRef, useState } from 'react';
import CombatantPanel from './CombatantPanel.jsx';
import MatchScoreBoard from './MatchScoreBoard.jsx';

const REVEAL_INTERVAL_MS = 220;

export default function SquadSelectionMatchesScreen({ state, onNext }) {
  const sim = state.squadSelectionMatches;
  const idx = sim.highlightIndex;
  const match = sim.highlightMatches[idx];
  const engine = match.engineState;
  const log = engine.log;
  const [revealed, setRevealed] = useState(0);
  const logRef = useRef(null);

  useEffect(() => { setRevealed(0); }, [idx]);

  useEffect(() => {
    if (revealed >= log.length) return undefined;
    const t = setTimeout(() => setRevealed((r) => Math.min(r + 1, log.length)), REVEAL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [revealed, log.length]);

  // 新しい行が常に見えるよう、ログ欄を最下部までスクロールしておく（スマホの狭いログ欄向け）。
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [revealed]);

  const done = revealed >= log.length;
  const isLast = idx + 1 >= sim.highlightMatches.length;
  const currentScore = revealed > 0 ? engine.scoreHistory[revealed - 1] : null;

  return (
    <div className="card">
      <h2>レギュラー決定試合 {idx + 1}/{sim.highlightMatches.length}：リーグ{match.league}</h2>
      <div className="sub" style={{ marginBottom: 10 }}>{match.aName} vs {match.bName}</div>

      <MatchScoreBoard score={currentScore} />

      <div className="battle-arena">
        <CombatantPanel combatant={engine.player} title="[選手]" highlight />
        <CombatantPanel combatant={engine.opponent} title="[選手]" />
      </div>

      <h3 style={{ marginTop: 14, fontSize: 13, color: '#9fd8b6' }}>試合経過</h3>
      <div className="battle-log" ref={logRef}>
        {log.slice(0, revealed).map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {done ? (
        <div className="action-footer">
          <div className="action-footer-note">
            {match.winnerName}が勝利した！
          </div>
          <button className="primary" onClick={onNext}>{isLast ? '部内戦の結果を見る' : '次の試合へ'}</button>
        </div>
      ) : (
        <div className="action-footer">
          <button onClick={() => setRevealed(log.length)}>スキップ</button>
        </div>
      )}
    </div>
  );
}
