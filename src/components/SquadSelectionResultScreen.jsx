export default function SquadSelectionResultScreen({ state, onProceed }) {
  const result = state.squadSelectionResult;
  const autoNames = result.autoQualifiedNames || [];
  const winnerNames = result.winners.map((id) => state.team.find((p) => p.id === id)?.name || '?');
  return (
    <div className="card">
      <h2>部内戦 結果（リーグ制）</h2>

      <div className="detail-grid">
        {result.leagueStandings.map((lg) => (
          <div key={lg.league}>
            <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>リーグ{lg.league}</h3>
            <div className="select-list" style={{ marginBottom: 12 }}>
              {lg.rows.map((r, i) => (
                <div key={r.id} className="select-item">
                  <div>{i + 1}位　{r.name}{result.winners.includes(r.id) ? <span className="tag saved" style={{ marginLeft: 6 }}>代表</span> : null}</div>
                  <div>{r.wins}勝</div>
                </div>
              ))}
              {lg.rows.length === 0 && <div className="sub">出場者なし。</div>}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 13, color: '#9fd8b6', marginTop: 14 }}>団体戦代表（{result.winners.length}人）</h3>
      <div style={{ marginBottom: 12 }}>
        {winnerNames.join('、')}
        {autoNames.length > 0 && <div className="sub" style={{ marginTop: 4 }}>（うち無条件選出：{autoNames.join('、')}）</div>}
      </div>
      <div className="action-footer">
        <button className="primary" onClick={onProceed}>個人戦へ進む</button>
      </div>
    </div>
  );
}
