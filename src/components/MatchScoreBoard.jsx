import { pointLabel } from '../game/battle.js';

const EMPTY_SCORE = { points: { player: 0, opponent: 0 }, games: { player: 0, opponent: 0 }, sets: { player: 0, opponent: 0 } };

// 再生アニメーション用のスコアボード。scoreHistoryのスナップショットを受け取り、
// ログの再生が進むのに合わせてポイント／ゲーム／セットが動いて見えるようにする。
export default function MatchScoreBoard({ score }) {
  const { points, games, sets } = score || EMPTY_SCORE;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="score-board">セット {sets.player}-{sets.opponent} ／ ゲーム {games.player}-{games.opponent}</div>
      <div className="score-sub">ポイント {pointLabel(points.player)}-{pointLabel(points.opponent)}</div>
    </div>
  );
}
