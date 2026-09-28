import { SQUAD_MIN } from '../game/data.js';

export default function GraduationResultScreen({ state, onNewGen, onGoToPart2 }) {
  const summary = state.lastGraduationSummary;
  const canPart2 = state.vault.length >= SQUAD_MIN;
  return (
    <div className="card">
      <h2>卒部処理 完了</h2>
      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>保存された選手</h3>
      {summary.saved.length === 0 ? <p>今回は保存資格を満たす選手がいなかった。</p> : (
        <div className="vault-grid">
          {summary.saved.map((s, i) => (
            <div className="vault-card" key={i}><div className="title">『{s.title}』</div><div>{s.name}</div></div>
          ))}
        </div>
      )}
      {summary.released.length > 0 && (
        <p style={{ fontSize: 12, color: '#9fd8b6', marginTop: 8 }}>引退：{summary.released.join('、')}</p>
      )}
      <div className="action-footer">
        <button className="primary" onClick={onNewGen}>新しい世代でもう一周する</button>
        {canPart2 ? (
          <button onClick={onGoToPart2}>保存庫（{state.vault.length}人）で第2部に挑戦する</button>
        ) : (
          <span className="sub" style={{ alignSelf: 'center' }}>
            第2部は保存選手が{SQUAD_MIN}人以上で挑戦可能（現在{state.vault.length}人）。周回して増やそう。
          </span>
        )}
      </div>
    </div>
  );
}
