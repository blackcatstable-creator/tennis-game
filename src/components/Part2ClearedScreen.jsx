import { COURT_CLEAR_THRESHOLD, SQUAD_CLEAR_COUNT } from '../game/data.js';

export default function Part2ClearedScreen({ state, onExit, onRestart, onGoToPart3 }) {
  const squad = state.part2.squad;
  const clearedCount = squad.filter((m) => m.courtRank <= COURT_CLEAR_THRESHOLD).length;
  const top = [...squad].sort((a, b) => a.courtRank - b.courtRank).slice(0, SQUAD_CLEAR_COUNT);

  return (
    <div className="card">
      <h2>第2部 クリア！</h2>
      <p>
        5番コート以内に{clearedCount}人を送り込み、第2部「高校挑戦編」のクリア条件を達成した。
        このメンバーが世界戦（第3部）の代表候補になる。
      </p>
      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>5番コート以内のメンバー</h3>
      <div className="vault-grid">
        {top.map((m) => (
          <div className="vault-card" key={m.id}>
            <div className="title">『{m.title}』</div>
            <div>{m.name}（{m.courtRank}番コート）</div>
          </div>
        ))}
      </div>
      <div className="action-footer">
        <button className="primary" onClick={onGoToPart3}>第3部（世界戦）に挑戦する</button>
        <button onClick={onExit}>部活運営に戻る</button>
        <button onClick={onRestart}>別の編成でもう一度挑戦する</button>
      </div>
    </div>
  );
}
