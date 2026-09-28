import { WORLD_STAGE_LABEL } from '../game/data.js';

export default function Part3StageResultScreen({ state, onNext }) {
  const p3 = state.part3;
  const results = p3.leagueResults[p3.stage];
  const wins = results.filter((r) => r === 'win').length;
  const advanced = wins >= 2;

  return (
    <div className="card">
      <h2>{WORLD_STAGE_LABEL[p3.stage]} 総合結果</h2>
      <div className="select-list" style={{ marginBottom: 14 }}>
        {results.map((r, i) => (
          <div key={i} className="select-item">
            <div>第{i + 1}試合</div>
            <div style={{ color: r === 'win' ? '#9fd8b6' : '#ff8a80' }}>{r === 'win' ? '勝利' : '敗北'}</div>
          </div>
        ))}
      </div>
      <p style={{ fontWeight: 'bold', color: advanced ? '#ffe6a3' : '#ff8a80' }}>
        {wins}勝{results.length - wins}敗 — {advanced ? `${WORLD_STAGE_LABEL[p3.stage]}を突破した！` : '突破ならず、世界戦はここで終了。'}
      </p>
      <div className="action-footer">
        <button className="primary" onClick={onNext}>
          {advanced ? '次のステージへ' : '結果を見る'}
        </button>
      </div>
    </div>
  );
}
