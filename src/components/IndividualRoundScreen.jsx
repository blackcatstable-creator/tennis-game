import { TOURNAMENT_STAGES, SAVE_ELIGIBLE_STAGE_INDEX, stageChampionRounds } from '../game/data.js';

export default function IndividualRoundScreen({ state, onAdvance, onClose }) {
  const t = state.individualTournament;
  const stage = TOURNAMENT_STAGES[t.stageIndex];
  const roundsNeeded = stage.individual.rounds;
  const championRounds = stageChampionRounds(stage, 'individual');
  const reachedChampionRound = t.finished && !(t.singlesAlive.length === 0 && t.doublesAlive.length === 0) && t.roundInStage >= championRounds;
  const champSingles = reachedChampionRound ? t.singlesAlive.map((id) => state.team.find((p) => p.id === id)).filter(Boolean) : [];
  const champDoubles = reachedChampionRound
    ? t.doublesAlive.map((pair) => [state.team.find((p) => p.id === pair.aId), state.team.find((p) => p.id === pair.bId)]).filter(([a, b]) => a && b)
    : [];

  return (
    <div className="card">
      <h2>個人戦：{stage.label} {t.roundInStage}/{championRounds}回戦（優勝までの回戦数） 結果</h2>
      <div className="sub" style={{ marginBottom: 10 }}>
        規模{stage.individual.participants}枠中、{stage.individual.advance ? `上位${stage.individual.advance}枠が勝ち抜け（${roundsNeeded}回戦突破が目安）。以後は優勝を懸けた戦い。` : '優勝を懸けた最終ステージ。'}
      </div>
      {t.stageCleared && !t.finished && (
        <div className="sub" style={{ marginBottom: 10, color: '#ffe6a3' }}>
          上位大会進出はすでに決定済みの選手がいる。ここから先は{stage.label}優勝を懸けた戦いだ。
        </div>
      )}

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>シングルス</h3>
      <div className="select-list" style={{ marginBottom: 14 }}>
        {t.roundSinglesResults.map((r) => (
          <div key={r.id} className="select-item">
            <div>{r.name} vs {r.opponentName}</div>
            <div style={{ color: r.won ? '#9fd8b6' : '#ff8a80' }}>{r.won ? '勝利' : '敗退'}</div>
          </div>
        ))}
        {t.roundSinglesResults.length === 0 && <div className="sub">出場者がいなかった。</div>}
      </div>

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>ダブルス</h3>
      <div className="select-list" style={{ marginBottom: 14 }}>
        {t.roundDoublesResults.map((r) => (
          <div key={`${r.aId}-${r.bId}`} className="select-item">
            <div>{r.names} vs {r.opponentName}</div>
            <div style={{ color: r.won ? '#9fd8b6' : '#ff8a80' }}>{r.won ? '勝利' : '敗退'}</div>
          </div>
        ))}
        {t.roundDoublesResults.length === 0 && <div className="sub">出場ペアがいなかった。</div>}
      </div>

      {t.finished ? (
        <div>
          <p className="sub" style={{ marginBottom: 6 }}>
            {reachedChampionRound
              ? `個人戦：${stage.label}で優勝した選手が出た！`
              : t.stageCleared
                ? `個人戦：${stage.label}の上位大会進出は決めていたが、優勝は逃した。`
                : `個人戦：${stage.label}で敗退した…`}
          </p>
          {reachedChampionRound && (champSingles.length > 0 || champDoubles.length > 0) && (
            <div className="sub" style={{ marginBottom: 6, color: '#ffe6a3' }}>
              {champSingles.map((p) => <div key={p.id}>優勝：{p.name}（シングルス）</div>)}
              {champDoubles.map(([a, b]) => <div key={`${a.id}-${b.id}`}>優勝：{a.name}・{b.name}（ダブルス）</div>)}
            </div>
          )}
          <p style={{ color: t.stageIndex >= SAVE_ELIGIBLE_STAGE_INDEX ? '#ffe6a3' : '#9fd8b6' }}>
            {t.stageIndex >= SAVE_ELIGIBLE_STAGE_INDEX
              ? '関東大会以上に進出した選手は、卒部時にデータが保存される資格を得た。'
              : '保存資格（関東大会出場）にはまだ届いていない。次の大会に期待。'}
          </p>
          <div className="sub" style={{ marginBottom: 10 }}>
            最終勝ち残り：シングルス{t.singlesAlive.length}人／ダブルス{t.doublesAlive.length}組
          </div>
          <div className="action-footer">
            <button className="primary" onClick={onClose}>団体戦へ進む（{stage.label}）</button>
          </div>
        </div>
      ) : (
        <div className="action-footer">
          <button className="primary" onClick={onAdvance}>次の試合（{stage.label} {t.roundInStage + 1}/{championRounds}回戦）へ</button>
        </div>
      )}
    </div>
  );
}
