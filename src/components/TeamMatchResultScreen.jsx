import { TOURNAMENT_STAGES, SAVE_ELIGIBLE_STAGE_INDEX, OPPONENT_ORDER_STRATEGY_LABEL, stageChampionRounds } from '../game/data.js';

export default function TeamMatchResultScreen({ state, onClose }) {
  const tm = state.teamMatch;
  const stage = TOURNAMENT_STAGES[tm.stageIndex];
  const isFinalStage = tm.stageIndex >= TOURNAMENT_STAGES.length - 1;
  const won = tm.result === 'win';
  const championRounds = stageChampionRounds(stage, 'team');
  // 進出はこの一戦の勝利で決まったか、すでに前の回戦で決まっている。
  const advanceSecured = state.teamStageAdvanceSecured || (won && state.teamStageRound >= state.teamStageRoundsNeeded);
  const championWin = won && state.teamStageRound >= championRounds;
  const moreRoundsToPlay = won && state.teamStageRound < championRounds;
  const reps = [...new Set(tm.positions.flatMap((p) => p.playerIds))]
    .map((id) => state.team.find((p) => p.id === id))
    .filter(Boolean);

  function nameOf(ids) {
    return ids.map((id) => state.team.find((p) => p.id === id)?.name || '?').join('・');
  }

  return (
    <div className="card">
      <h2>団体戦結果：{stage.label}</h2>
      <div className="stage-track">
        {TOURNAMENT_STAGES.map((s, i) => (
          <span key={s.key} className={`stage-chip ${(advanceSecured ? i <= tm.stageIndex : i < tm.stageIndex) ? 'reached' : ''} ${i === tm.stageIndex ? 'current' : ''}`}>{s.label}</span>
        ))}
      </div>

      <div className="score-board">チームスコア {tm.score.player} - {tm.score.opponent}</div>
      <div className="sub" style={{ textAlign: 'center', marginBottom: 4 }}>
        {stage.label} {state.teamStageRound}/{championRounds}回戦（優勝までの回戦数・参加{stage.team.participants}チーム中）
      </div>
      <p style={{ textAlign: 'center' }}>
        {won
          ? (championWin
            ? `${stage.label}で優勝した！`
            : advanceSecured
              ? `${isFinalStage ? 'この大会' : TOURNAMENT_STAGES[tm.stageIndex + 1].label}への進出は決定済み。優勝を懸けてなお挑む（あと${championRounds - state.teamStageRound}回戦）。`
              : `この一戦は勝利。あと${state.teamStageRoundsNeeded - state.teamStageRound}回戦を勝ち抜けば上位大会進出。`)
          : (advanceSecured
            ? `優勝は逃したが、${isFinalStage ? 'この大会' : TOURNAMENT_STAGES[tm.stageIndex + 1].label}への進出はすでに決定済み。`
            : `${stage.label}で敗退した…`)}
      </p>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>各ポジション結果</h3>
      <div className="select-list">
        {tm.positions.map((p) => (
          <div key={p.key} className="select-item">
            <div>{p.label}：{nameOf(p.playerIds)} vs {p.opponent.name}</div>
            <div style={{ color: p.result === 'win' ? '#9fd8b6' : p.result === 'lose' ? '#ff8a80' : '#9fd8b6' }}>
              {p.result === 'win' ? '勝利' : p.result === 'lose' ? '敗北' : '未消化（勝敗が決したため不戦）'}
            </div>
          </div>
        ))}
      </div>

      {tm.schoolName && (
        <div className="sub" style={{ marginTop: 10 }}>
          答え合わせ：{tm.schoolName}のオーダーは「{OPPONENT_ORDER_STRATEGY_LABEL[tm.scoutingStrategy]}」だった。
        </div>
      )}

      <p style={{ marginTop: 10 }}>
        {tm.stageIndex >= SAVE_ELIGIBLE_STAGE_INDEX
          ? '関東大会以上に出場した代表選手は、卒部時にデータが保存される資格を得た。'
          : '保存資格（関東大会出場）にはまだ届いていない。次の団体戦に期待。'}
      </p>
      <div className="sub" style={{ fontSize: 11, marginBottom: 10 }}>代表：{reps.map((p) => p.name).join('、')}</div>

      <div className="action-footer">
        <button className="primary" onClick={onClose}>{moreRoundsToPlay ? `次の試合（${state.teamStageRound + 1}回戦）へ` : '育成に戻る'}</button>
      </div>
    </div>
  );
}
