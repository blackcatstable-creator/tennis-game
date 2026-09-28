import { WORLD_STAGE_LABEL } from '../game/data.js';

export default function Part3TieResultScreen({ state, onNext }) {
  const p3 = state.part3;
  const tie = p3.currentTie;
  const byId = new Map(p3.squad.map((m) => [m.id, m]));
  const won = tie.result === 'win';

  function nameOf(ids) { return ids.map((id) => byId.get(id)?.name || '?').join('・'); }

  return (
    <div className="card">
      <h2>{WORLD_STAGE_LABEL[tie.stage]} vs {tie.country} 結果</h2>
      <div className="score-board">{tie.score.player} - {tie.score.opponent}</div>
      <p style={{ textAlign: 'center' }}>{won ? `${tie.country}に勝利した！` : `${tie.country}に敗れた…`}</p>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>各ポジション結果</h3>
      <div className="select-list">
        {tie.positions.map((pos) => (
          <div key={pos.key} className="select-item">
            <div>{pos.label}：{nameOf(pos.playerIds)}</div>
            <div style={{ color: pos.result === 'win' ? '#9fd8b6' : pos.result === 'lose' ? '#ff8a80' : '#9fd8b6' }}>
              {pos.result === 'win' ? '勝利' : pos.result === 'lose' ? '敗北' : '未消化'}
            </div>
          </div>
        ))}
      </div>

      <div className="action-footer">
        <button className="primary" onClick={onNext}>次へ</button>
      </div>
    </div>
  );
}
