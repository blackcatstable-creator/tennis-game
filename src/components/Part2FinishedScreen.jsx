import { SQUAD_CLEAR_COUNT } from '../game/data.js';

export default function Part2FinishedScreen({ state, onExit, onRestart }) {
  const clearedCount = state.part2.finalClearedCount;
  return (
    <div className="card">
      <h2>第2部：挑戦終了</h2>
      <p>5番コート以内に到達したのは{clearedCount}/{SQUAD_CLEAR_COUNT}人。クリア条件には届かなかった。</p>
      <div className="action-footer">
        <button className="primary" onClick={onRestart}>編成を選び直してもう一度挑戦する</button>
        <button onClick={onExit}>部活運営に戻る</button>
      </div>
    </div>
  );
}
