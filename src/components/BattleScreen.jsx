import { useEffect, useRef, useState } from 'react';
import { TOURNAMENT_STAGES, WORLD_STAGE_LABEL, stageChampionRounds } from '../game/data.js';
import { isClutch, pointLabel } from '../game/battle.js';
import CombatantPanel from './CombatantPanel.jsx';
import BattleCutIn from './BattleCutIn.jsx';

const AUTO_STEP_MS = 480;
const CUTIN_HOLD_MS = 1600;

// 試合はプレイヤー操作なしの完全おまかせ：一定間隔で自動的にターンが進み、スコアが積み上がっていく様子を見せる。
// ゲーム/セット/マッチが決した瞬間や必殺技発動時だけ、テニスをしている風のカットインで一呼吸置いて見せる。
export default function BattleScreen({ state, onAutoTurn, onAutoFinish, onContinue }) {
  const engine = state.battleContext.engineState;
  const isTeamMatch = state.battleContext.type === 'teamMatch';
  const isIndividualSingles = state.battleContext.type === 'individualSingles';
  const isIndividualDoubles = state.battleContext.type === 'individualDoubles';
  const isWorldTie = state.battleContext.type === 'worldTie';
  const isPart2Match = state.battleContext.type === 'part2Match';

  const clutch = isClutch(engine);

  const [fx, setFx] = useState({ player: null, opponent: null });
  const [cutIn, setCutIn] = useState(null);
  const lastSeqRef = useRef(0);
  const fxTimeoutRef = useRef(null);
  const cutInTimeoutRef = useRef(null);

  // 決め球・必殺技発動・勝敗決着時の簡易演出（フラッシュ／シェイク／カットイン）。
  // engineはコマンドのたびにdeepCloneされ参照が変わるため、実際に新しいターンが
  // 解決されたかどうかはlastTurn.seqの変化で判定する（無関係な再描画では発火しない）。
  useEffect(() => {
    const lt = engine.lastTurn;
    if (!lt || lt.seq === lastSeqRef.current) return;
    lastSeqRef.current = lt.seq;

    const next = { player: null, opponent: null };
    if (lt.atkSkillName) next[lt.atkSide] = 'skill';
    if (lt.defSkillName && !next[lt.defSide]) next[lt.defSide] = 'skill';
    if (lt.outcome === 'atk_point' || lt.outcome === 'def_point') {
      const winSide = lt.outcome === 'atk_point' ? lt.atkSide : lt.defSide;
      const loseSide = winSide === 'player' ? 'opponent' : 'player';
      next[winSide] = 'point-win';
      next[loseSide] = 'point-lose';
    }
    if (lt.matchWon && lt.winnerSide) {
      const loseSide = lt.winnerSide === 'player' ? 'opponent' : 'player';
      next[lt.winnerSide] = 'match-win';
      next[loseSide] = 'match-lose';
    }
    setFx(next);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(lt.matchWon ? [40, 40, 80] : lt.outcome !== 'continue' ? 30 : 15);
    }
    if (fxTimeoutRef.current) clearTimeout(fxTimeoutRef.current);
    fxTimeoutRef.current = setTimeout(() => setFx({ player: null, opponent: null }), 900);

    // カットイン対象：ゲーム/セット/マッチが決した瞬間、または必殺技が絡んだ瞬間だけに絞る。
    const bigMoment = lt.gameWon || lt.setWon || lt.matchWon;
    const skillUsed = !!(lt.atkSkillName || lt.defSkillName);
    if (bigMoment || skillUsed) {
      const decided = lt.outcome === 'atk_point' || lt.outcome === 'def_point';
      const winSide = decided ? (lt.outcome === 'atk_point' ? lt.atkSide : lt.defSide) : null;
      const skillSide = lt.atkSkillName ? lt.atkSide : (lt.defSkillName ? lt.defSide : null);
      const kind = lt.matchWon ? 'match' : lt.setWon ? 'set' : lt.gameWon ? 'game' : 'skill';
      setCutIn({
        kind,
        atkName: engine[lt.atkSide].ref.name,
        defName: engine[lt.defSide].ref.name,
        winnerName: winSide ? engine[winSide].ref.name : null,
        skillName: lt.atkSkillName || lt.defSkillName || null,
        skillOwnerName: skillSide ? engine[skillSide].ref.name : null,
      });
      if (cutInTimeoutRef.current) clearTimeout(cutInTimeoutRef.current);
      cutInTimeoutRef.current = setTimeout(() => setCutIn(null), CUTIN_HOLD_MS);
    }
  }, [engine]);
  useEffect(() => () => {
    if (fxTimeoutRef.current) clearTimeout(fxTimeoutRef.current);
    if (cutInTimeoutRef.current) clearTimeout(cutInTimeoutRef.current);
  }, []);

  // カットイン表示中は一呼吸置くため自動進行を止め、消えたら再開する。
  useEffect(() => {
    if (engine.matchOver) return undefined;
    if (cutIn) return undefined;
    const t = setTimeout(() => onAutoTurn(), AUTO_STEP_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, cutIn]);

  let heading = 'スパーリング';
  if (isTeamMatch) {
    const tm = state.teamMatch;
    const stage = TOURNAMENT_STAGES[tm.stageIndex];
    const pos = tm.positions[tm.posIndex];
    const teamChampionRounds = stageChampionRounds(stage, 'team');
    const teamRoundLabel = state.teamStageAdvanceSecured
      ? `優勝を懸けた${state.teamStageRound}/${teamChampionRounds}回戦`
      : `${state.teamStageRound}/${state.teamStageRoundsNeeded}回戦`;
    heading = `団体戦：${stage.label} ${teamRoundLabel} ${pos.label}（チームスコア ${tm.score.player}-${tm.score.opponent}）`;
  } else if (isIndividualSingles || isIndividualDoubles) {
    const t = state.individualTournament;
    const stage = TOURNAMENT_STAGES[t.stageIndex];
    const indivChampionRounds = stageChampionRounds(stage, 'individual');
    const indivRoundLabel = t.stageCleared
      ? `優勝を懸けた${t.roundInStage}/${indivChampionRounds}回戦`
      : `${t.roundInStage}/${stage.individual.rounds}回戦`;
    heading = `個人戦：${stage.label} ${indivRoundLabel}（${isIndividualSingles ? 'シングルス' : 'ダブルス'}）　注目カード：${engine.player.ref.name}`;
  } else if (isWorldTie) {
    const tie = state.part3.currentTie;
    const pos = tie.positions[tie.posIndex];
    heading = `世界戦：${WORLD_STAGE_LABEL[tie.stage]} vs ${tie.country} ${pos.label}（スコア ${tie.score.player}-${tie.score.opponent}）`;
  } else if (isPart2Match) {
    heading = `第2部：${state.battleContext.target}番コートを賭けた一戦`;
  }

  return (
    <div className="card" style={{ position: 'relative' }}>
      <h2>{heading}</h2>

      <div className="score-board">
        セット {engine.sets.player}-{engine.sets.opponent} ／ ゲーム {engine.games.player}-{engine.games.opponent}
      </div>
      <div className="score-sub">
        ポイント {pointLabel(engine.points.player)}-{pointLabel(engine.points.opponent)}
        {engine.points.player >= 3 && engine.points.opponent >= 3 ? '（デュース：次の1本が勝負）' : ''}
        {!engine.matchOver && clutch ? '　／　緊迫の展開！' : ''}
      </div>

      <div className="battle-arena">
        <CombatantPanel combatant={engine.player} title="[操作]" highlight fx={fx.player} />
        <CombatantPanel combatant={engine.opponent} title="[相手]" fx={fx.opponent} />
      </div>

      <h3 style={{ marginTop: 14, fontSize: 13, color: '#9fd8b6' }}>試合経過</h3>
      <div className="battle-log">
        {engine.log.slice().reverse().slice(0, 30).map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {cutIn && <BattleCutIn data={cutIn} />}

      {!engine.matchOver ? (
        <div className="action-footer">
          <button onClick={onAutoFinish}>スキップ（最後まで見る）</button>
        </div>
      ) : (
        <div className="action-footer">
          <div className="action-footer-note">
            {engine.winner === 'player' ? `${engine.player.ref.name}の勝利！` : `${engine.opponent.ref.name}の勝利…`}
          </div>
          <button className="primary" onClick={onContinue}>次へ</button>
        </div>
      )}

    </div>
  );
}
