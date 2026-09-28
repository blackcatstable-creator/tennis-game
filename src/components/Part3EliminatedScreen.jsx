import { WORLD_STAGE_LABEL } from '../game/data.js';

export default function Part3EliminatedScreen({ state, onExit, onRestart }) {
  const p3 = state.part3;
  return (
    <div className="card">
      <h2>世界戦 終了</h2>
      <p>{WORLD_STAGE_LABEL[p3.eliminatedAt]}で敗退した。世界の頂点にはあと一歩届かなかった。</p>
      <div className="action-footer">
        <button className="primary" onClick={onRestart}>同じ代表チームで再挑戦する</button>
        <button onClick={onExit}>部活運営に戻る</button>
      </div>
    </div>
  );
}
