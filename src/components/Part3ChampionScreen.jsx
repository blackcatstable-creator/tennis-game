export default function Part3ChampionScreen({ state, onExit, onRestart }) {
  const squad = state.part3.squad;
  const active = squad.filter((m) => !m.part3Withdrawn);
  return (
    <div className="card">
      <h2>世界一 達成！</h2>
      <p>決勝でドイツを下し、『THE RISING COURT』世界戦編を制覇した。育て上げた選手たちが、ついに世界の頂点に立った。</p>
      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>世界代表メンバー（{active.length}人）</h3>
      <div className="vault-grid">
        {active.map((m) => (
          <div className="vault-card" key={m.id}>
            <div className="title">『{m.title}』</div>
            <div>{m.name}</div>
            <div style={{ fontSize: 12 }}>{m.part3Record.wins}勝{m.part3Record.losses}敗</div>
          </div>
        ))}
      </div>
      <div className="action-footer">
        <button className="primary" onClick={onExit}>部活運営に戻る</button>
        <button onClick={onRestart}>同じ代表チームでもう一度挑戦する</button>
      </div>
    </div>
  );
}
