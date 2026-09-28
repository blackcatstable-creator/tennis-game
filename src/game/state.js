// ============================================================
// state.js — メタゲーム進行（育成ループ・部内戦/団体戦フロー・保存/引継ぎ）
// ============================================================
import {
  STATS, STYLE_FOCUS, SUMMER_WEEK, WINTER_WEEK, TOTAL_YEARS,
  TOURNAMENT_STAGES, SAVE_ELIGIBLE_STAGE_INDEX, POSITIONS, stageChampionRounds,
  generateTeam, generateOpponent, generateOpponentForPosition, makeDoublesRef, statTotal, makeTitle, trySparkSkill, tryLevelUpSkill,
  generateOpponentTeamRoster, assignOpponentOrder, opponentRefForPosition,
  generateRecruits, reputationIndexFromTeam,
  COURT_COUNT, COURT_CLEAR_THRESHOLD, COURT_CAPACITY, CHALLENGE_TURN_CAP, SQUAD_MIN, SQUAD_CLEAR_COUNT,
  generateCourtGuardian, makeSquadMember, computePart2Roles, computeSquadRequiredPairs,
  TEAM_INJURY_CHANCE, TEAM_INJURY_MIN_WEEKS, TEAM_INJURY_MAX_WEEKS,
  WORLD_STAGE_LABEL, WORLD_STAGE_MULT, WORLD_LEAGUE_ROUNDS, WORLD_POSITIONS,
  WORLD_FINAL_COUNTRY, WORLD_SEMI_CANDIDATES,
  rollPart3Injury, pickRandomCountries, generateWorldOpponent, makePart3SquadMember,
  coachLevelInfo, coachTrainingMult, coachSkillChanceMult, coachInjuryMult, coachRecoveryBonus,
  COACH_EXP_PER_WEEK, COACH_EXP_PER_WIN, COACH_EXP_PART2_PER_CLEARED,
  clamp, randInt, pick,
} from './data.js';
import {
  newBattleState, submitPlayerCommand, autoAdvanceOneTurn, autoFinishMatch, simulateWholeMatch, simulateCappedMatch,
} from './battle.js';
import { schoolById } from './schools.js';

// state.schoolId から中学定義を引く。未設定（旧セーブ等）の場合は先頭校（陽泉中学校）にフォールバック。
function schoolOf(s) { return schoolById(s.schoolId); }

// 操作方針（企画書2.1）：フルマニュアル／セミオート／フルオートの3モード。試合前・試合中いつでも切替可能。
export const BATTLE_MODES = ['manual', 'semi', 'auto'];
export const BATTLE_MODE_LABEL = { manual: 'フルマニュアル', semi: 'セミオート', auto: 'フルオート' };

const SAVE_KEY = 'trc_save_v1';

function deepClone(o) {
  return typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o));
}

export function saveGame(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage full/unavailable: ignore */ }
}
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

function pushLog(state, msg) { state.log = [msg, ...state.log].slice(0, 60); }

// ------------------------------------------------------------
// コーチ（主人公）の成長。金銭に一切関係せず、指導と勝利という「経験」だけで少しずつ熟練していく。
// ------------------------------------------------------------
function coachLevelOf(s) { return coachLevelInfo(s.coach.exp).level; }

function gainCoachExp(s, amount) {
  if (!amount) return;
  const before = coachLevelOf(s);
  s.coach.exp += amount;
  const after = coachLevelOf(s);
  if (after > before) {
    const msg = `監督としての経験を積み、コーチLv.${after}に成長した！`;
    pushLog(s, msg);
    if (s.part2) s.part2.log = [msg, ...s.part2.log].slice(0, 60);
  }
}

// 必殺技の習得・強化チャンス（baseChance）にコーチの熟練度補正をかけてロールする。
function coachSkillRoll(s, player, baseChance) {
  const mult = coachSkillChanceMult(coachLevelOf(s)) * schoolOf(s).coachTrait.skillChanceMult;
  return rollSkillGrowth(player, Math.min(0.95, baseChance * mult));
}

// 必殺技の成長判定を1回分だけロールする。既存技があればレベルアップを優先し、
// 空き枠があれば新規習得も起こる（企画書2.4の習得ルート1・3：トレーニング／伝授）。
function rollSkillGrowth(player, chance) {
  if (!player || !player.skills) return null;
  if (Math.random() >= chance) return null;
  const upgradable = player.skills.some((sk) => sk.level < 3);
  if (upgradable && (player.skills.length >= 4 || Math.random() < 0.5)) {
    const sk = tryLevelUpSkill(player);
    return sk ? { type: 'levelup', skill: sk } : null;
  }
  if (player.skills.length < 4) {
    const sk = trySparkSkill(player);
    return sk ? { type: 'new', skill: sk } : null;
  }
  return null;
}

// 試合中に発生した「試合中覚醒」（battle.jsのmaybeGrowSkillClutch）をログに反映する。
function reportSparks(state, engineLike) {
  if (!engineLike || !engineLike.sparks) return;
  engineLike.sparks.forEach((sp) => {
    const ref = engineLike[sp.side] && engineLike[sp.side].ref;
    if (!ref) return;
    if (sp.type === 'levelup') pushLog(state, `${ref.name}の必殺技『${sp.skill.name}』が試合の中でLv${sp.skill.level}に成長した！`);
    else pushLog(state, `${ref.name}が試合の流れの中で必殺技『${sp.skill.name}』を閃いた！`);
  });
}

export function newGame(school) {
  const s = {
    version: 2,
    schoolId: school.id,
    genNumber: 1,
    year: 1,
    week: 1,
    team: generateTeam(school),
    coach: { exp: 0 },
    vault: [],
    log: ['1年生として入部した。育成を始めよう。'],
    screen: 'squadSelection',
    battleMode: 'semi',
    battleContext: null,
    teamStageIndex: 0,
    teamStageRound: 1,
    teamStageRoundsNeeded: null,
    teamStageAdvanceSecured: false,
    teamDistrictCleared: false,
    teamChampionships: {}, // stage.key -> 通算優勝回数（世代をまたいで積み上がる部の実績）
    individualTournament: null,
    squadSelectionResult: null,
    squadSelectionMatches: null,
    lineup: null,
    teamMatch: null,
    teamMatchScouting: null,
    pendingSeason: null,
    lastGraduationSummary: null,
    part2: null,
    part3: null,
  };
  runToNextSeason(s);
  return s;
}

export function setBattleMode(state, mode) {
  const s = deepClone(state);
  s.battleMode = BATTLE_MODES.includes(mode) ? mode : s.battleMode;
  return s;
}

function pickTrainingStats(p, n) {
  const primary = STYLE_FOCUS[p.style] || STATS;
  const pool = Math.random() < 0.8 ? primary : STATS;
  const chosen = new Set();
  let guard = 0;
  while (chosen.size < n && guard < 30) { chosen.add(pick(pool)); guard += 1; }
  return [...chosen];
}

function applyActionToPlayer(state, p, action) {
  const growth = 0.7 + (p.potential / 100) * 0.6;
  const school = schoolOf(state);
  const trainMult = coachTrainingMult(coachLevelOf(state)) * school.coachTrait.trainingMult;
  const injuryMult = coachInjuryMult(coachLevelOf(state)) * school.coachTrait.injuryMult;
  if (action === 'basic') {
    pickTrainingStats(p, 2).forEach((s) => { p.stats[s] = clamp(p.stats[s] + Math.max(1, Math.round(randInt(1, 3) * growth * trainMult)), 1, 99); });
    p.condition = clamp(p.condition - 5, 0, 100);
    pushLog(state, `${p.name}は基礎トレに励んだ。`);
  } else if (action === 'hard') {
    if (Math.random() < 0.15 * injuryMult) {
      p.injured = true;
      p.condition = clamp(p.condition - 40, 0, 100);
      pushLog(state, `${p.name}が高負荷トレで怪我をした…！ しばらく療養が必要だ。`);
    } else {
      pickTrainingStats(p, 3).forEach((s) => { p.stats[s] = clamp(p.stats[s] + Math.max(1, Math.round(randInt(3, 6) * growth * trainMult)), 1, 99); });
      p.condition = clamp(p.condition - 16, 0, 100);
      pushLog(state, `${p.name}は高負荷トレで大きく成長した。`);
    }
    const skillGrowth = coachSkillRoll(state, p, 0.16);
    if (skillGrowth) {
      if (skillGrowth.type === 'levelup') pushLog(state, `${p.name}は高負荷トレで必殺技『${skillGrowth.skill.name}』を鍛え上げ、Lv${skillGrowth.skill.level}に成長した！`);
      else pushLog(state, `${p.name}が高負荷トレで必殺技『${skillGrowth.skill.name}』を閃いた！`);
    }
  } else if (action === 'practice') {
    const practicePosition = POSITIONS.find((pos) => pos.type === 'singles') || POSITIONS[0];
    const oppRef = generateOpponentForPosition(0, statTotal(p), practicePosition);
    const result = simulateWholeMatch(p, oppRef, 'player');
    if (result.winner === 'player') {
      const s = pick(STATS);
      p.stats[s] = clamp(p.stats[s] + 1, 1, 99);
      p.record.wins += 1;
      pushLog(state, `${p.name}は練習試合に勝利した。`);
      gainCoachExp(state, COACH_EXP_PER_WIN);
    } else {
      p.record.losses += 1;
      pushLog(state, `${p.name}は練習試合で敗れた。`);
    }
    reportSparks(state, result);
    p.condition = clamp(p.condition - 8, 0, 100);
  } else if (action === 'rest') {
    p.condition = clamp(p.condition + 25 + coachRecoveryBonus(coachLevelOf(state)) + school.coachTrait.recoveryBonus, 0, 100);
    pushLog(state, `${p.name}は休養してコンディションを整えた。`);
  } else if (action === 'event') {
    p.condition = clamp(p.condition + 5, 0, 100);
    pushLog(state, `${p.name}はコーチ・先輩と交流した。`);
    const skillGrowth = coachSkillRoll(state, p, 0.24);
    if (skillGrowth) {
      if (skillGrowth.type === 'levelup') pushLog(state, `${p.name}はコーチ・先輩の指導で必殺技『${skillGrowth.skill.name}』が磨かれ、Lv${skillGrowth.skill.level}に成長した！`);
      else pushLog(state, `${p.name}が先輩から必殺技『${skillGrowth.skill.name}』を伝授された！`);
    }
  }
}

// 部内序列を毎週ごく緩やかにステータスへ寄せる。実力差が大きい隣接ペアは一定確率で序列も入れ替わり、
// 成長した選手が少しずつ序列を勝ち取っていくようにする（一気に総合値順へは揃えない）。
function applyStatRankDrift(s) {
  const sorted = [...s.team].sort((a, b) => a.rank - b.rank);
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const higher = sorted[i];
    const lower = sorted[i + 1];
    if (statTotal(lower) - statTotal(higher) >= 15 && Math.random() < 0.35) {
      const tmp = higher.rank;
      higher.rank = lower.rank;
      lower.rank = tmp;
      sorted[i] = lower;
      sorted[i + 1] = higher;
    }
  }
}

// 行動選択なし・完全自動成長：コンディションが低ければ休養、それ以外は基礎/高負荷/練習試合/イベントから
// ランダムに選ばせる（プレイヤーの操作は一切介在しない）。
function pickAutoAction(p) {
  if (p.condition < 35) return 'rest';
  const roll = Math.random();
  if (roll < 0.40) return 'basic';
  if (roll < 0.65) return 'hard';
  if (roll < 0.85) return 'practice';
  return 'event';
}

function advanceOneWeekAuto(s) {
  const recoveryBonus = coachRecoveryBonus(coachLevelOf(s)) + schoolOf(s).coachTrait.recoveryBonus;
  s.team.forEach((p) => {
    if (p.teamInjuryWeeksLeft > 0) {
      p.teamInjuryWeeksLeft -= 1;
      if (p.teamInjuryWeeksLeft <= 0) {
        p.teamInjured = false;
        pushLog(s, `${p.name}が団体戦向けの負傷から回復した。`);
      }
    }
    if (p.injured) {
      p.condition = clamp(p.condition + 20 + recoveryBonus, 0, 100);
      if (p.condition >= 60) { p.injured = false; pushLog(s, `${p.name}が療養から復帰した。`); }
      else pushLog(s, `${p.name}は療養中だ（コンディション${p.condition}）。`);
      return;
    }
    applyActionToPlayer(s, p, pickAutoAction(p));
  });
  applyStatRankDrift(s);
  gainCoachExp(s, COACH_EXP_PER_WEEK);
  s.week += 1;
}

// 部内戦（シーズン開幕）まで、行動選択なしで自動的に週を進め続ける。到達したら団体戦向けの
// 負傷判定を行い、部内戦（代表選抜）画面へ進む。ゲーム開始直後・大会終了直後の両方から呼ばれる。
function runToNextSeason(s) {
  do { advanceOneWeekAuto(s); } while (s.week !== SUMMER_WEEK && s.week !== WINTER_WEEK);
  s.pendingSeason = s.week === SUMMER_WEEK ? 'summer' : 'winter';
  pushLog(s, `${s.pendingSeason === 'summer' ? '夏' : '冬'}の大会が近づいてきた。まずは部内戦で団体戦の代表を選ぼう。`);
  rollTeamInjuryForNewTournament(s);
  s.screen = 'squadSelection';
}

// ------------------------------------------------------------
// 個人戦（シングルス／ダブルス）。地区大会→都道府県大会→関東大会→全国大会の順に、
// 1シーズンにつき現在の大会ステージ（team側と共有するs.teamStageIndex）を1つだけ行い、
// 終わったら同じステージの団体戦へ引き継ぐ（個人戦→団体戦→次のステージの個人戦→…の順）。
// 原則全員がそのステージから出場し、勝者のみがステージ内の次ラウンドへ勝ち上がる。
// ダブルスは部内序列順に2人1組でペアを組み、奇数の場合は最後の1人があまる（今大会は不出場）。
// ------------------------------------------------------------
function buildDoublesPairs(sortedEligible) {
  const pairs = [];
  for (let i = 0; i + 1 < sortedEligible.length; i += 2) {
    pairs.push({ aId: sortedEligible[i].id, bId: sortedEligible[i + 1].id });
  }
  const byeId = sortedEligible.length % 2 === 1 ? sortedEligible[sortedEligible.length - 1].id : null;
  return { pairs, byeId };
}

export function beginIndividualTournament(state, customPairs) {
  const s = deepClone(state);
  const eligible = s.team.filter((p) => !p.injured);
  const sorted = [...eligible].sort((a, b) => a.rank - b.rank);
  const eligibleIds = new Set(eligible.map((p) => p.id));
  let pairs, byeId;
  if (customPairs && customPairs.length) {
    // ユーザーが手動で組んだペアをそのまま採用する（欠場者を除外し、重複・不整合があれば無視）。
    const used = new Set();
    pairs = [];
    customPairs.forEach(([aId, bId]) => {
      if (!aId || !bId) return;
      if (!eligibleIds.has(aId) || !eligibleIds.has(bId)) return;
      if (used.has(aId) || used.has(bId)) return;
      used.add(aId); used.add(bId);
      pairs.push({ aId, bId });
    });
    byeId = eligible.find((p) => !used.has(p.id))?.id || null;
  } else {
    ({ pairs, byeId } = buildDoublesPairs(sorted));
  }
  s.individualTournament = {
    season: s.pendingSeason,
    stageIndex: s.teamStageIndex,
    roundInStage: 1,
    stageCleared: false,
    singlesAlive: eligible.map((p) => p.id),
    doublesAlive: pairs,
    byeId,
    roundSinglesResults: [],
    roundDoublesResults: [],
    nextSinglesAlive: [],
    nextDoublesAlive: [],
    pendingQueue: [],
    finished: false,
  };
  const stage0 = TOURNAMENT_STAGES[s.teamStageIndex];
  pushLog(s, `個人戦開幕：${stage0.label}（規模${stage0.individual.participants}枠・上位${stage0.individual.advance}枠が勝ち抜け・${stage0.individual.rounds}回戦制）にシングルス${eligible.length}人・ダブルス${pairs.length}組が出場する。`);
  return processIndividualStage(s);
}

function teamAvgOf(s) { return s.team.reduce((sum, p) => sum + statTotal(p), 0) / s.team.length; }

function announceIndividualGrowth(s, player, sourceLabel) {
  const growth = coachSkillRoll(s, player, 0.12);
  if (!growth) return;
  if (growth.type === 'levelup') pushLog(s, `${player.name}は${sourceLabel}で必殺技『${growth.skill.name}』がLv${growth.skill.level}に成長した！`);
  else pushLog(s, `${player.name}は${sourceLabel}で必殺技『${growth.skill.name}』を閃いた！`);
}

function resolveIndividualSingles(s, playerId, stageIndex, teamAvg) {
  const p = s.team.find((x) => x.id === playerId);
  const opp = generateOpponent(stageIndex, teamAvg);
  const result = simulateWholeMatch(p, opp, Math.random() < 0.5 ? 'player' : 'opponent');
  const won = result.winner === 'player';
  p.record[won ? 'wins' : 'losses'] += 1;
  if (won) p.furthestStageReached = Math.max(p.furthestStageReached, stageIndex);
  reportSparks(s, result);
  if (won) { gainCoachExp(s, COACH_EXP_PER_WIN); announceIndividualGrowth(s, p, '個人戦'); }
  return { id: p.id, name: p.name, won, opponentName: opp.name };
}

function resolveIndividualDoubles(s, pair, stageIndex, teamAvg) {
  const a = s.team.find((x) => x.id === pair.aId);
  const b = s.team.find((x) => x.id === pair.bId);
  const ref = makeDoublesRef(a, b);
  const opp = generateOpponent(stageIndex, teamAvg);
  const result = simulateWholeMatch(ref, opp, Math.random() < 0.5 ? 'player' : 'opponent');
  const won = result.winner === 'player';
  [a, b].forEach((pl) => {
    pl.record[won ? 'wins' : 'losses'] += 1;
    if (won) pl.furthestStageReached = Math.max(pl.furthestStageReached, stageIndex);
  });
  reportSparks(s, result);
  if (won) { gainCoachExp(s, COACH_EXP_PER_WIN); [a, b].forEach((pl) => announceIndividualGrowth(s, pl, '個人戦（ダブルス）')); }
  return { aId: a.id, bId: b.id, names: `${a.name}・${b.name}`, won, opponentName: opp.name };
}

// 部内序列が最も高い（rankが小さい）参加者のidを返す。
function bestRankSinglesId(s, ids) {
  if (!ids.length) return null;
  return ids.reduce((best, id) => {
    const p = s.team.find((x) => x.id === id);
    const bp = s.team.find((x) => x.id === best);
    return p.rank < bp.rank ? id : best;
  }, ids[0]);
}

function pairBestRank(s, pair) {
  return Math.min(s.team.find((x) => x.id === pair.aId).rank, s.team.find((x) => x.id === pair.bId).rank);
}

// このステージの全試合を解決する。コーチ（主人公）はコートに立たないため通常は全試合を即時自動決着させるが、
// このステージの突破（上位大会進出）がかかる最終回戦に限り、部内最上位シードのシングルス・ダブルス各1戦を
// 「見どころの一戦」として対話式に回し、介入の余地を残す
// （操作方針がフルオートでも対話式画面自体は経由し、そこで自動進行するかは操作方針に従う）。
function processIndividualStage(s) {
  const t = s.individualTournament;
  const teamAvg = teamAvgOf(s);

  const stage = TOURNAMENT_STAGES[t.stageIndex];
  const isDecidingRound = t.roundInStage >= stage.individual.rounds;

  const featuredSinglesId = isDecidingRound ? bestRankSinglesId(s, t.singlesAlive) : null;
  const featuredPairIdx = isDecidingRound
    ? t.doublesAlive.reduce((best, pair, idx) => {
      if (best < 0) return idx;
      return pairBestRank(s, pair) < pairBestRank(s, t.doublesAlive[best]) ? idx : best;
    }, -1)
    : -1;

  t.roundSinglesResults = [];
  t.roundDoublesResults = [];
  t.nextSinglesAlive = [];
  t.nextDoublesAlive = [];

  t.singlesAlive.forEach((id) => {
    if (id === featuredSinglesId) return;
    const r = resolveIndividualSingles(s, id, t.stageIndex, teamAvg);
    t.roundSinglesResults.push(r);
    if (r.won) t.nextSinglesAlive.push(id);
  });
  t.doublesAlive.forEach((pair, idx) => {
    if (idx === featuredPairIdx) return;
    const r = resolveIndividualDoubles(s, pair, t.stageIndex, teamAvg);
    t.roundDoublesResults.push(r);
    if (r.won) t.nextDoublesAlive.push(pair);
  });

  t.pendingQueue = [];
  if (featuredSinglesId) t.pendingQueue.push({ kind: 'singles', playerId: featuredSinglesId });
  if (featuredPairIdx >= 0) t.pendingQueue.push({ kind: 'doubles', pairIdx: featuredPairIdx });

  return startNextIndividualBattle(s);
}

function startNextIndividualBattle(s) {
  const t = s.individualTournament;
  if (!t.pendingQueue.length) {
    finalizeIndividualRound(s);
    return s;
  }
  const item = t.pendingQueue[0];
  const teamAvg = teamAvgOf(s);
  if (item.kind === 'singles') {
    const player = s.team.find((p) => p.id === item.playerId);
    const opponent = generateOpponent(t.stageIndex, teamAvg);
    s.battleContext = {
      type: 'individualSingles',
      engineState: newBattleState(player, opponent, Math.random() < 0.5 ? 'player' : 'opponent'),
      playerId: item.playerId,
      opponentName: opponent.name,
    };
  } else {
    const pair = t.doublesAlive[item.pairIdx];
    const a = s.team.find((x) => x.id === pair.aId);
    const b = s.team.find((x) => x.id === pair.bId);
    const ref = makeDoublesRef(a, b);
    const opponent = generateOpponent(t.stageIndex, teamAvg);
    s.battleContext = {
      type: 'individualDoubles',
      engineState: newBattleState(ref, opponent, Math.random() < 0.5 ? 'player' : 'opponent'),
      pair,
      opponentName: opponent.name,
    };
  }
  s.screen = 'battle';
  return s;
}

function finalizeIndividualRound(s) {
  const t = s.individualTournament;
  t.singlesAlive = t.nextSinglesAlive;
  t.doublesAlive = t.nextDoublesAlive;
  const allEliminated = t.singlesAlive.length === 0 && t.doublesAlive.length === 0;
  const stage = TOURNAMENT_STAGES[t.stageIndex];
  const roundsNeeded = stage.individual.rounds;
  const championRounds = stageChampionRounds(stage, 'individual');
  // 必要勝ち星（上位大会進出枠）に届いた瞬間が「進出決定」。一度決まれば、この先の回戦で
  // 敗れても進出そのものは取り消さない（stageClearedはsticky）。
  if (!t.stageCleared && !allEliminated && t.roundInStage >= roundsNeeded) {
    t.stageCleared = true;
    pushLog(s, `個人戦：${stage.label}で上位大会進出を決めた選手がいる！ここからは${stage.label}優勝を懸けた戦いが続く。`);
  }
  const reachedChampionRound = !allEliminated && t.roundInStage >= championRounds;
  if (reachedChampionRound) {
    t.singlesAlive.forEach((id) => {
      const p = s.team.find((x) => x.id === id);
      if (!p) return;
      p.record.championships = (p.record.championships || 0) + 1;
      pushLog(s, `${p.name}が${stage.label}シングルスで優勝した！`);
    });
    t.doublesAlive.forEach((pair) => {
      const a = s.team.find((x) => x.id === pair.aId);
      const b = s.team.find((x) => x.id === pair.bId);
      [a, b].forEach((p) => { if (p) p.record.championships = (p.record.championships || 0) + 1; });
      if (a && b) pushLog(s, `${a.name}・${b.name}組が${stage.label}ダブルスで優勝した！`);
    });
  }
  // 個人戦は1シーズンにつき現在のステージだけを行う。進出決定後も優勝が懸かる回戦までは続け、
  // そこで（勝敗いずれでも）決着したら終了して団体戦（同じステージ）へ引き継ぐ。次のステージへは進まない。
  t.finished = allEliminated || t.roundInStage >= championRounds;
  s.screen = 'individualRound';
}

export function afterIndividualBattle(state) {
  const s = deepClone(state);
  const t = s.individualTournament;
  const engine = s.battleContext.engineState;
  const item = t.pendingQueue.shift();
  const won = engine.winner === 'player';
  reportSparks(s, engine);
  if (item.kind === 'singles') {
    const player = s.team.find((p) => p.id === item.playerId);
    player.record[won ? 'wins' : 'losses'] += 1;
    if (won) player.furthestStageReached = Math.max(player.furthestStageReached, t.stageIndex);
    t.roundSinglesResults.push({ id: player.id, name: player.name, won, opponentName: s.battleContext.opponentName });
    if (won) { t.nextSinglesAlive.push(player.id); gainCoachExp(s, COACH_EXP_PER_WIN); announceIndividualGrowth(s, player, '個人戦'); }
  } else {
    const pair = s.battleContext.pair;
    const a = s.team.find((x) => x.id === pair.aId);
    const b = s.team.find((x) => x.id === pair.bId);
    [a, b].forEach((pl) => {
      pl.record[won ? 'wins' : 'losses'] += 1;
      if (won) pl.furthestStageReached = Math.max(pl.furthestStageReached, t.stageIndex);
    });
    t.roundDoublesResults.push({ aId: a.id, bId: b.id, names: `${a.name}・${b.name}`, won, opponentName: s.battleContext.opponentName });
    if (won) { t.nextDoublesAlive.push(pair); gainCoachExp(s, COACH_EXP_PER_WIN); [a, b].forEach((pl) => announceIndividualGrowth(s, pl, '個人戦（ダブルス）')); }
  }
  s.battleContext = null;
  return startNextIndividualBattle(s);
}

// 同じステージ内の次ラウンドへ進む（stageCleared済み、すなわち個人戦が終了した場合はここは呼ばれず、
// closeIndividualResultで同じステージの団体戦へ引き継がれる）。
export function advanceIndividualStage(state) {
  const s = deepClone(state);
  const t = s.individualTournament;
  t.roundInStage += 1;
  return processIndividualStage(s);
}

// 団体戦シーズンに入るタイミングで団体戦特有の負傷を判定する。大会をまたぐと必ず全快するため、
// まず前回大会からの負傷を強制的に治し、そのうえで今大会分の新規負傷（同時に1人まで）を抽選する。
function rollTeamInjuryForNewTournament(s) {
  s.team.forEach((p) => { p.teamInjured = false; p.teamInjuryWeeksLeft = 0; });
  const eligible = s.team.filter((p) => !p.injured);
  // 負傷させても団体戦オーダー（7人）を組めなくならないよう、十分な人数がいる時だけ発生させる。
  if (eligible.length < 8) return;
  if (Math.random() >= TEAM_INJURY_CHANCE * coachInjuryMult(coachLevelOf(s)) * schoolOf(s).coachTrait.injuryMult) return;
  const victim = pick(eligible);
  victim.teamInjured = true;
  victim.teamInjuryWeeksLeft = randInt(TEAM_INJURY_MIN_WEEKS, TEAM_INJURY_MAX_WEEKS);
  pushLog(s, `${victim.name}が負傷し、今大会の団体戦には出場できない（回復まで約${victim.teamInjuryWeeksLeft}週）。`);
}

// 個人戦（大会）が終わった直後の処理。代表はすでに部内戦（季節開幕時）で決めてあるので、
// そのままオーダー編成（団体戦）へ進む。
export function closeIndividualResult(state) {
  const s = deepClone(state);
  s.individualTournament = null;
  s.lineup = { winners: s.squadSelectionResult.winners };
  s.teamMatchScouting = generateTeamMatchScouting(s, s.teamStageIndex);
  s.screen = 'lineup';
  pushLog(s, `${s.pendingSeason === 'summer' ? '夏' : '冬'}の団体戦オーダーを決めよう。`);
  return s;
}

// ------------------------------------------------------------
// 部内戦（代表選抜リーグ戦）。出場者を選択した数のリーグ（leagueAssign: { playerId: 0-(leagueCount-1) }、
// 画面側で自動／ランダム／手動編集して決める）に分け、リーグ内総当たりを行う。
// 療養（怪我療養・団体戦向けの負傷）による出場制限は大会本編のみに適用され、部内戦は全部員が参加する。
// 部員数が保証人数（7人）を超えている場合のみ、各リーグ上位2人（リーグ人数が2人以下ならその全員）に絞って
// 代表を選抜する。部員数が保証人数以下の場合は誰も脱落させず、全員に部内戦（成長機会）を経験させたうえで
// 全員がそのまま代表になる。
// ------------------------------------------------------------
// 全試合から「レギュラー決定試合」としてアニメーション再生する最大count試合を、
// リーグをまたいで均等に散らばるよう選ぶ（試合数がcount以下ならすべて選ぶ）。
const SQUAD_HIGHLIGHT_COUNT = 8;
function pickSquadHighlights(matches, count = SQUAD_HIGHLIGHT_COUNT) {
  if (matches.length <= count) return matches;
  const step = matches.length / count;
  const usedIdx = new Set();
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    let idx = Math.min(matches.length - 1, Math.round(i * step));
    while (usedIdx.has(idx) && idx < matches.length - 1) idx += 1;
    usedIdx.add(idx);
    picks.push(matches[idx]);
  }
  return picks;
}

export function resolveSquadSelectionLeague(state, leagueAssign, leagueCount = 4) {
  const s = deepClone(state);
  const eligible = s.team;
  const noCut = computeSquadRequiredPairs(eligible.length) === 0;
  const leagues = Array.from({ length: leagueCount }, () => []);
  eligible.forEach((p) => {
    const idx = leagueAssign[p.id];
    const league = (idx >= 0 && idx < leagueCount) ? idx : 0;
    leagues[league].push(p);
  });
  const matches = [];
  const winners = [];
  const autoQualifiedNames = [];
  const leagueStandings = [];
  leagues.forEach((members, leagueIdx) => {
    if (members.length === 0) { leagueStandings.push({ league: leagueIdx + 1, rows: [] }); return; }
    const wins = new Map(members.map((p) => [p.id, 0]));
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        const result = simulateWholeMatch(a, b, 'player');
        const winner = result.winner === 'player' ? a : b;
        wins.set(winner.id, wins.get(winner.id) + 1);
        matches.push({
          league: leagueIdx + 1, aId: a.id, aName: a.name, bId: b.id, bName: b.name, winnerId: winner.id, winnerName: winner.name, engineState: result,
        });
        reportSparks(s, result);
      }
    }
    const ranked = [...members].sort((a, b) => (wins.get(b.id) - wins.get(a.id)) || (a.rank - b.rank));
    const advanceCount = noCut ? ranked.length : Math.min(2, ranked.length);
    const leagueWinners = ranked.slice(0, advanceCount);
    if (members.length === 1) leagueWinners.forEach((p) => autoQualifiedNames.push(p.name));
    leagueWinners.forEach((p) => {
      winners.push(p.id);
      const pl = s.team.find((x) => x.id === p.id);
      pl.record.wins += 1;
      gainCoachExp(s, COACH_EXP_PER_WIN);
      const skillGrowth = coachSkillRoll(s, pl, 0.15);
      if (skillGrowth) {
        if (skillGrowth.type === 'levelup') pushLog(s, `${pl.name}は部内戦（リーグ戦）で必殺技『${skillGrowth.skill.name}』がLv${skillGrowth.skill.level}に成長した！`);
        else pushLog(s, `${pl.name}は部内戦（リーグ戦）で必殺技『${skillGrowth.skill.name}』を閃いた！`);
      }
    });
    leagueStandings.push({ league: leagueIdx + 1, rows: ranked.map((p) => ({ id: p.id, name: p.name, wins: wins.get(p.id) })) });
  });
  pushLog(s, `部内戦（${leagueCount}リーグ制）: 全${matches.length}試合を実施し、各リーグ上位者計${winners.length}人が団体戦代表に選ばれた。`);
  const highlightMatches = pickSquadHighlights(matches);
  // squadSelectionResultは以後も保存され続けるため、全試合分のengineState（対戦ログ）は持たせずライトに保つ。
  const lightMatches = matches.map(({ engineState: _engineState, ...rest }) => rest);
  s.squadSelectionResult = { matches: lightMatches, winners, autoQualifiedNames, leagueStandings, format: 'league' };
  if (highlightMatches.length > 0) {
    s.squadSelectionMatches = { highlightMatches, highlightIndex: 0 };
    s.screen = 'squadSelectionMatches';
  } else {
    s.screen = 'squadSelectionResult';
  }
  return s;
}

export function advanceSquadSelectionHighlight(state) {
  const s = deepClone(state);
  const sim = s.squadSelectionMatches;
  sim.highlightIndex += 1;
  if (sim.highlightIndex >= sim.highlightMatches.length) {
    s.squadSelectionMatches = null;
    s.screen = 'squadSelectionResult';
  }
  return s;
}

// 相手校の7人ロースター＋秘密のオーダーを新しく用意する。ロースターはオーダー編成画面で
// スカウティング情報として開示されるが、実際の配置（オーダー）は対戦を通じてしか分からない。
function generateTeamMatchScouting(s, stageIndex) {
  const teamAvg = teamAvgOf(s);
  const roster = generateOpponentTeamRoster(stageIndex, teamAvg, s.team.map((p) => p.name));
  const order = assignOpponentOrder(roster);
  return { roster, order };
}

// 部内戦（代表選抜）の結果画面から、大会本編（個人戦→団体戦オーダー編成）へ進む。
export function proceedToIndividualTournament(state) {
  const s = deepClone(state);
  s.screen = 'individualBriefing';
  return s;
}

function buildPositionRef(state, playerIds) {
  if (playerIds.length === 1) return state.team.find((p) => p.id === playerIds[0]);
  const a = state.team.find((p) => p.id === playerIds[0]);
  const b = state.team.find((p) => p.id === playerIds[1]);
  return makeDoublesRef(a, b);
}

// このステージ内の1回戦分の対戦カード（S1〜D2）を組み、最初のポジション戦を開始する。
// ステージを跨がず同じオーダーで連戦する（次ラウンド突入時にも呼ばれる）。
function startTeamRound(s, stageIndex, assignments) {
  const scouting = s.teamMatchScouting;
  const positions = POSITIONS.map((pos) => {
    const playerIds = pos.type === 'singles' ? [assignments[pos.key]] : assignments[pos.key];
    return { ...pos, playerIds, opponent: opponentRefForPosition(scouting.roster, scouting.order.assignment, pos), result: null };
  });
  s.teamMatch = {
    stageIndex, assignments, positions, posIndex: 0, score: { player: 0, opponent: 0 }, result: null,
    schoolName: scouting.roster.schoolName, scoutingStrategy: scouting.order.strategy,
  };
  const first = positions[0];
  const ref = buildPositionRef(s, first.playerIds);
  s.battleContext = { type: 'teamMatch', engineState: newBattleState(ref, first.opponent, 'player') };
  s.screen = 'battle';
}

// assignments = { s1, s2, s3, d1: [idX, idY], d2: [idX, idY], reserve }
export function confirmLineup(state, assignments) {
  const s = deepClone(state);
  const stageIndex = s.teamStageIndex;
  const stage = TOURNAMENT_STAGES[stageIndex];
  const seeded = stageIndex === 0 && s.teamDistrictCleared;
  s.teamStageRoundsNeeded = (seeded && stage.team.seedRounds) ? stage.team.seedRounds : stage.team.rounds;
  s.teamStageRound = 1;
  s.teamStageAdvanceSecured = false;
  s.lineup = null;
  s.squadSelectionResult = null;
  s.squadSelectionMatches = null;
  startTeamRound(s, stageIndex, assignments);
  pushLog(s, `団体戦開始：${stage.label}（参加${stage.team.participants}チーム中${stage.team.rounds}回戦制${seeded ? '・実績によりシード出場で1回戦少なく突破可能' : ''}／今回は${s.teamStageRound}/${s.teamStageRoundsNeeded}回戦目）`);
  return s;
}

export function afterTeamPositionMatch(state) {
  const s = deepClone(state);
  const engine = s.battleContext.engineState;
  const tm = s.teamMatch;
  const pos = tm.positions[tm.posIndex];
  const won = engine.winner === 'player';
  tm.score[won ? 'player' : 'opponent'] += 1;
  pos.result = won ? 'win' : 'lose';
  const stageLabel = TOURNAMENT_STAGES[tm.stageIndex].label;

  reportSparks(s, engine);
  if (won) gainCoachExp(s, COACH_EXP_PER_WIN);
  pos.playerIds.forEach((id) => {
    const p = s.team.find((pl) => pl.id === id);
    if (!p) return;
    p.record[won ? 'wins' : 'losses'] += 1;
    p.furthestStageReached = Math.max(p.furthestStageReached, tm.stageIndex);
    p.history.push({ season: s.pendingSeason, year: s.year, stage: stageLabel, position: pos.label, result: won ? '勝利' : '敗退' });
    if (won) {
      const skillGrowth = coachSkillRoll(s, p, 0.12);
      if (skillGrowth) {
        if (skillGrowth.type === 'levelup') pushLog(s, `${p.name}は団体戦で必殺技『${skillGrowth.skill.name}』がLv${skillGrowth.skill.level}に成長した！`);
        else pushLog(s, `${p.name}は団体戦で必殺技『${skillGrowth.skill.name}』を閃いた！`);
      }
    }
  });
  pushLog(s, `${stageLabel} ${pos.label}: ${won ? '勝利' : '敗北'}（チームスコア ${tm.score.player}-${tm.score.opponent}）`);

  if (tm.score.player >= 3 || tm.score.opponent >= 3) {
    tm.result = tm.score.player >= 3 ? 'win' : 'lose';
    s.screen = 'teamMatchResult';
    return s;
  }

  tm.posIndex += 1;
  const next = tm.positions[tm.posIndex];
  const ref = buildPositionRef(s, next.playerIds);
  s.battleContext = { type: 'teamMatch', engineState: newBattleState(ref, next.opponent, Math.random() < 0.5 ? 'player' : 'opponent') };
  s.screen = 'battle';
  return s;
}

export function closeTeamMatchResult(state) {
  const s = deepClone(state);
  const tm = s.teamMatch;
  const wasSummer = s.pendingSeason === 'summer';
  const wasWinter = s.pendingSeason === 'winter';
  const stageIndex = tm.stageIndex;
  const stage = TOURNAMENT_STAGES[stageIndex];
  const stageLabel = stage.label;
  const isFinalStage = stageIndex >= TOURNAMENT_STAGES.length - 1;
  const championRounds = stageChampionRounds(stage, 'team');
  if (!s.teamChampionships) s.teamChampionships = {}; // 旧セーブ互換

  if (tm.result === 'win') {
    // 必要勝ち星に届いた瞬間が「上位大会進出」の決定タイミング。以後は敗れても進出自体は覆らない。
    if (!s.teamStageAdvanceSecured && s.teamStageRound >= s.teamStageRoundsNeeded) {
      s.teamStageAdvanceSecured = true;
      if (stageIndex === 0) s.teamDistrictCleared = true;
      if (!isFinalStage) pushLog(s, `団体戦：${stageLabel}突破！${TOURNAMENT_STAGES[stageIndex + 1].label}への進出が決定した。`);
    }
    if (s.teamStageRound < championRounds) {
      // 進出が決まっていてもステージ優勝までは終わらない。同じオーダーで次の回戦（優勝を懸けた一戦）へ。
      s.teamStageRound += 1;
      pushLog(s, s.teamStageAdvanceSecured
        ? `団体戦：進出は決定済みだが、${stageLabel}優勝を懸けて${s.teamStageRound}回戦へ挑む！`
        : `団体戦：${stageLabel} ${s.teamStageRound}/${s.teamStageRoundsNeeded}回戦へ進出！`);
      // 次の回戦は別の対戦校。同じオーダーのまま、新しいロースター＋秘密のオーダーで再スカウティングする。
      s.teamMatchScouting = generateTeamMatchScouting(s, stageIndex);
      startTeamRound(s, stageIndex, tm.assignments);
      return s;
    }
    // 優勝がかかる最終回戦にも勝ち切った＝このステージを制覇した。
    s.teamChampionships[stage.key] = (s.teamChampionships[stage.key] || 0) + 1;
    pushLog(s, `団体戦：${stageLabel}で優勝した！`);
    if (!isFinalStage) {
      s.teamStageIndex = stageIndex + 1;
      pushLog(s, `次は${TOURNAMENT_STAGES[s.teamStageIndex].label}へ！`);
    }
  } else if (s.teamStageAdvanceSecured) {
    // 優勝を懸けた回戦で敗れただけで、進出自体はすでに確定している。
    pushLog(s, `団体戦：${stageLabel} ${s.teamStageRound}回戦で敗れた。優勝は逃したが、${isFinalStage ? '大会' : TOURNAMENT_STAGES[stageIndex + 1].label}への進出はすでに決定済み。`);
    if (!isFinalStage) s.teamStageIndex = stageIndex + 1;
  } else {
    pushLog(s, `団体戦：${stageLabel} ${s.teamStageRound}回戦で敗退した…`);
  }

  s.teamMatch = null;
  s.teamMatchScouting = null;
  s.battleContext = null;
  s.teamStageAdvanceSecured = false;
  s.pendingSeason = null;

  // 3年生は最終学年の夏大会をもって引退する。
  if (wasSummer && s.year >= TOTAL_YEARS) {
    s.screen = 'graduation';
    return s;
  }

  if (wasWinter) {
    s.week = 1;
    s.year += 1;
    s.team.forEach((p) => { p.grade = Math.min(3, p.grade + 1); });
    const reputationIndex = reputationIndexFromTeam(s.team);
    const recruits = generateRecruits(reputationIndex, s.team.map((p) => p.name), s.team.length, schoolOf(s));
    if (recruits.length) {
      const maxRank = s.team.reduce((m, p) => Math.max(m, p.rank), 0);
      recruits.forEach((r, i) => { r.rank = maxRank + i + 1; });
      s.team.push(...recruits);
      pushLog(s, `${s.year}年生に進級。${TOURNAMENT_STAGES[reputationIndex].label}レベルの評判で新入部員が${recruits.length}人入部した。`);
    } else {
      pushLog(s, `${s.year}年生に進級した。`);
    }
  }
  runToNextSeason(s);
  return s;
}

export function processGraduation(state) {
  const s = deepClone(state);
  const eligible = s.team.filter((p) => p.furthestStageReached >= SAVE_ELIGIBLE_STAGE_INDEX);
  eligible.forEach((p) => {
    p.saved = true;
    const t = makeTitle(p);
    p.title = t.display;
    p.titleId = t.id;
    p.titleNational = t.national;
    s.vault.push(p);
  });
  const released = s.team.filter((p) => !eligible.includes(p)).map((p) => p.name);
  s.lastGraduationSummary = {
    saved: eligible.map((p) => ({ name: p.name, title: p.title })),
    released,
  };
  pushLog(s, `卒部: ${eligible.length}人の選手データを保存した。`);
  s.team = [];
  s.screen = 'graduationResult';
  return s;
}

export function startNewGeneration(state) {
  const s = deepClone(state);
  s.genNumber += 1;
  s.year = 1;
  s.week = 1;
  s.team = generateTeam(schoolOf(s));
  s.teamStageIndex = 0;
  s.teamStageRound = 1;
  s.teamStageRoundsNeeded = null;
  s.teamStageAdvanceSecured = false;
  s.teamDistrictCleared = false;
  if (!s.teamChampionships) s.teamChampionships = {}; // 通算優勝回数は世代をまたいで持ち越す（学校の実績）
  s.individualTournament = null;
  s.squadSelectionResult = null;
  s.squadSelectionMatches = null;
  s.lineup = null;
  s.teamMatch = null;
  s.teamMatchScouting = null;
  s.lastGraduationSummary = null;
  s.log = [`${s.genNumber}世代目の新入部員が入部した。`];
  runToNextSeason(s);
  return s;
}

export function submitBattleCommand(state, cmd) {
  const s = deepClone(state);
  submitPlayerCommand(s.battleContext.engineState, cmd);
  return s;
}

export function autoAdvanceBattleTurn(state) {
  const s = deepClone(state);
  autoAdvanceOneTurn(s.battleContext.engineState);
  return s;
}

export function autoFinishBattle(state) {
  const s = deepClone(state);
  autoFinishMatch(s.battleContext.engineState);
  return s;
}

// ------------------------------------------------------------
// 第2部：高校挑戦編（コート昇格制）
// 保存庫（vault）からSQUAD_MIN〜SQUAD_MAX人を選抜する。シングルス／ダブルスの振り分けとペア編成は
// プレイヤーが手動で決める（自動振り分けは初期提案のみ）。挑戦そのものは「50ターン固定・組み合わせ自動」の
// 一発シミュレーションとして1回で決着する。
// 各コート（20番を除く）は定員COURT_CAPACITY人。5番コート以内にSQUAD_CLEAR_COUNT人以上でクリア。
// ------------------------------------------------------------
export function canEnterPart2(state) { return state.vault.length >= SQUAD_MIN; }

export function goToPart2SquadSelect(state) {
  const s = deepClone(state);
  s.screen = 'part2SquadSelect';
  return s;
}

// 保存庫から選抜し、シングルス／ダブルスの初期提案（プレイヤーが次画面で編集する叩き台）を作る。
export function confirmPart2Squad(state, selectedIds) {
  const s = deepClone(state);
  const squad = selectedIds
    .map((id) => s.vault.find((p) => p.id === id))
    .filter(Boolean)
    .map(makeSquadMember);
  const roles = computePart2Roles(squad);
  s.part2 = {
    squad,
    roles,
    log: [`${squad.length}人の遠征メンバーで第2部が始まった。全員${COURT_COUNT}番コートからのスタートだ。`],
    cleared: false,
    finalClearedCount: 0,
    simResult: null,
    cascade: null,
  };
  s.screen = 'part2RoleAssign';
  return s;
}

function pushPart2Log(s, msg) { s.part2.log = [msg, ...s.part2.log].slice(0, 60); }

// squad/roles から「ユニット」（シングルス1人 or ダブルス1組）を組み立てる。
function buildPart2Units(squad, roles) {
  const byId = new Map(squad.map((m) => [m.id, m]));
  const units = [];
  roles.singles.forEach((id) => {
    const m = byId.get(id);
    if (m) units.push({ id, type: 'singles', memberIds: [id], label: m.name, courtRank: m.courtRank });
  });
  roles.doubles.forEach(([aId, bId]) => {
    const a = byId.get(aId);
    const b = byId.get(bId);
    if (a && b) units.push({ id: `${aId}+${bId}`, type: 'doubles', memberIds: [aId, bId], label: `${a.name}・${b.name}`, courtRank: a.courtRank });
  });
  return { byId, units };
}

// 5つの見どころ試合を選ぶ：1番コートを賭けた試合／ダブルスの試合／競り合い（昇格枠の奪い合い）を優先し、
// 見つからない分は全体からバランスよく補う。
const PART2_HIGHLIGHT_COUNT = 5;
function pickPart2Highlights(allMatches) {
  const picks = [];
  const tryAdd = (m) => { if (m && !picks.includes(m)) picks.push(m); };
  tryAdd(allMatches.find((m) => m.target === 1));
  tryAdd(allMatches.find((m) => m.memberIds.length === 2));
  tryAdd(allMatches.find((m) => m.kind === 'challengeMatch'));
  if (picks.length < PART2_HIGHLIGHT_COUNT && allMatches.length) {
    const step = Math.max(1, Math.floor(allMatches.length / PART2_HIGHLIGHT_COUNT));
    for (let i = 0; i < allMatches.length && picks.length < PART2_HIGHLIGHT_COUNT; i += step) tryAdd(allMatches[i]);
  }
  for (const m of allMatches) {
    if (picks.length >= PART2_HIGHLIGHT_COUNT) break;
    tryAdd(m);
  }
  return picks;
}

// 「入れ替え戦」枠が空いていても一定確率で発生する率。満員時は常に入れ替え戦になる。
const CHALLENGE_MATCH_CHANCE = 0.4;
const PART2_MAX_PASSES = 30;

// s.part2.squad／s.part2.cascade.units から、判定に必要なヘルパー（選手マップ・ユニットマップ・
// ユニット→対戦データref変換）をその都度組み立てる。Map自体はstateに保存しない（シリアライズ対象外）。
function part2CascadeHelpers(s) {
  const byId = new Map(s.part2.squad.map((m) => [m.id, m]));
  const unitById = new Map(s.part2.cascade.units.map((u) => [u.id, u]));
  const refOf = (unit) => (unit.type === 'singles'
    ? byId.get(unit.memberIds[0])
    : makeDoublesRef(byId.get(unit.memberIds[0]), byId.get(unit.memberIds[1])));
  return { byId, unitById, refOf };
}

// 第2部にはトレーニング・怪我システムが存在しないため、コーチの熟練度による恩恵は必殺技の
// 習得・強化チャンスにのみ反映される（企画書：第2部の成長は主に必殺技に偏る）。
function recordPart2Result(s, byId, unit, won) {
  unit.memberIds.forEach((id) => {
    const m = byId.get(id);
    m.part2Record[won ? 'wins' : 'losses'] += 1;
    if (won) coachSkillRoll(s, m, 0.08);
  });
}

function movePart2UnitTo(cascade, unit, newRank) {
  const prevIdx = cascade.courts[unit.courtRank]?.indexOf(unit.id);
  if (prevIdx >= 0) cascade.courts[unit.courtRank].splice(prevIdx, 1);
  unit.courtRank = newRank;
  if (newRank <= COURT_COUNT - 1) cascade.courts[newRank].push(unit.id);
}

// squad/rolesからカスケードの初期状態を組み立てる（全員COURT_COUNT番からのスタート＝コートは全て空）。
// state全体としてシリアライズ・保存できるよう、プレーンなオブジェクト／配列のみで構成する。
function initPart2Cascade(squad, roles) {
  const { units } = buildPart2Units(squad, roles);
  const courts = {};
  for (let c = 1; c <= COURT_COUNT - 1; c += 1) courts[c] = [];
  return {
    units,
    courts,
    passesRun: 1,
    order: units.filter((u) => u.courtRank > 1).map((u) => u.id).sort(() => Math.random() - 0.5),
    anyMoveThisPass: false,
    pausedForCourt1: false,
    pendingChallenge: null,
    allMatches: [],
  };
}

// コート挑戦カスケードを1区切り分進める。自動決着できる分は内部ループで解決し続け、
// 1番コート（最上位）を賭けた最初の一戦に到達した時だけ一時停止して呼び出し元に返す。
// allowPause=falseの場合（操作方針がフルオートの時）は一切一時停止せず、従来通り最後まで自動決着する。
function stepPart2Cascade(s, allowPause) {
  const cascade = s.part2.cascade;
  const { byId, unitById, refOf } = part2CascadeHelpers(s);

  for (;;) {
    if (!cascade.order.length) {
      if (!cascade.anyMoveThisPass || cascade.passesRun >= PART2_MAX_PASSES) return { status: 'done' };
      cascade.passesRun += 1;
      cascade.anyMoveThisPass = false;
      cascade.order = cascade.units.filter((u) => u.courtRank > 1).map((u) => u.id).sort(() => Math.random() - 0.5);
      continue;
    }

    const unitId = cascade.order.shift();
    const unit = unitById.get(unitId);
    const target = unit.courtRank - 1;
    const occupants = cascade.courts[target];
    const isFull = occupants.length >= COURT_CAPACITY;
    // 空きがあっても、既に在籍者がいれば一定確率で「入れ替え戦」（本人を直接指名）が発生する。
    // 満員なら必ず入れ替え戦。在籍者がいない、または空きコマ狙いなら番人への挑戦になる。
    const doChallengeMatch = occupants.length > 0 && (isFull || Math.random() < CHALLENGE_MATCH_CHANCE);
    const weakestId = doChallengeMatch
      ? occupants.reduce((worstId, id) => (
        statTotal(refOf(unitById.get(id))) < statTotal(refOf(unitById.get(worstId))) ? id : worstId
      ), occupants[0])
      : null;

    if (target === 1 && allowPause && !cascade.pausedForCourt1) {
      cascade.pausedForCourt1 = true;
      cascade.pendingChallenge = doChallengeMatch
        ? { unitId, target, defenderId: weakestId }
        : { unitId, target, guardianRef: generateCourtGuardian(target, statTotal(refOf(unit))) };
      return { status: 'paused', pending: cascade.pendingChallenge };
    }

    const opponentRef = doChallengeMatch ? refOf(unitById.get(weakestId)) : generateCourtGuardian(target, statTotal(refOf(unit)));
    const opponentLabel = doChallengeMatch ? unitById.get(weakestId).label : opponentRef.name;
    const result = simulateCappedMatch(refOf(unit), opponentRef, 'player', CHALLENGE_TURN_CAP);
    cascade.allMatches.push({
      unitLabel: unit.label, opponentLabel, target, kind: doChallengeMatch ? 'challengeMatch' : 'guardian', engineState: result, memberIds: unit.memberIds,
    });
    const won = result.winner === 'player';
    recordPart2Result(s, byId, unit, won);
    if (won) {
      if (doChallengeMatch) {
        // 入れ替え戦：挑戦者が昇格し、敗れた在籍者は挑戦者の元いたコートまで陥落する。
        const defender = unitById.get(weakestId);
        recordPart2Result(s, byId, defender, false);
        const oldRank = unit.courtRank;
        const idx = occupants.indexOf(weakestId);
        occupants.splice(idx, 1);
        movePart2UnitTo(cascade, unit, target);
        movePart2UnitTo(cascade, defender, oldRank);
      } else {
        movePart2UnitTo(cascade, unit, target);
      }
      cascade.anyMoveThisPass = true;
    }
  }
}

// カスケードが完了した後の結果確定処理（見どころ試合のピックアップ・クリア判定・画面遷移）。
function finalizePart2Cascade(s) {
  const cascade = s.part2.cascade;
  const byId = new Map(s.part2.squad.map((m) => [m.id, m]));
  cascade.units.forEach((u) => { u.memberIds.forEach((id) => { byId.get(id).courtRank = u.courtRank; }); });
  const allMatches = cascade.allMatches;
  const highlightMatches = pickPart2Highlights(allMatches);
  allMatches.forEach((m) => reportSparks(s, m.engineState));
  const clearedCount = s.part2.squad.filter((m) => m.courtRank <= COURT_CLEAR_THRESHOLD).length;
  s.part2.simResult = { highlightMatches, highlightIndex: 0, totalMatches: allMatches.length };
  s.part2.finalClearedCount = clearedCount;
  s.part2.cleared = clearedCount >= SQUAD_CLEAR_COUNT;
  s.part2.cascade = null;
  pushPart2Log(s, `挑戦シミュレーション終了：全${allMatches.length}試合、5番コート以内${clearedCount}/${SQUAD_CLEAR_COUNT}人。`);
  // 第2部にはトレーニングがなく、コーチの成長も少しだけ。ここで一括して経験値を得る（必殺技の伸びに主に効く）。
  gainCoachExp(s, Math.round(clearedCount * COACH_EXP_PART2_PER_CLEARED));
  s.screen = highlightMatches.length > 0 ? 'part2Highlight' : 'part2OverallResult';
}

// カスケードを一時停止（1番コートの決戦）または完了まで進める。一時停止した場合は対話式バトル画面
// （type: 'part2Match'）を開き、操作方針（フルマニュアル／セミオート／フルオート）に従って進行できるようにする。
function driveCascade(s) {
  const allowPause = s.battleMode !== 'auto';
  const result = stepPart2Cascade(s, allowPause);
  if (result.status === 'done') {
    finalizePart2Cascade(s);
    return s;
  }
  const { unitById, refOf } = part2CascadeHelpers(s);
  const pending = result.pending;
  const unit = unitById.get(pending.unitId);
  const opponentRef = pending.guardianRef || refOf(unitById.get(pending.defenderId));
  s.battleContext = { type: 'part2Match', engineState: newBattleState(refOf(unit), opponentRef, 'player'), target: pending.target };
  s.screen = 'battle';
  return s;
}

// 「この編成で挑戦を開始する」ボタンから呼ばれる。組み合わせ自動でカスケードを開始し、
// 1番コートの決戦に達するまで（フルオートなら最後まで）自動進行させる。
export function runPart2Challenge(state, roles) {
  const s = deepClone(state);
  if (roles) s.part2.roles = roles;
  s.part2.cascade = initPart2Cascade(s.part2.squad, s.part2.roles);
  return driveCascade(s);
}

// 1番コートの決戦（対話式バトル画面）の決着を受けて、カスケードの残りを再開する。
export function afterPart2Match(state) {
  const s = deepClone(state);
  const engine = s.battleContext.engineState;
  const cascade = s.part2.cascade;
  const pending = cascade.pendingChallenge;
  const { byId, unitById } = part2CascadeHelpers(s);
  const unit = unitById.get(pending.unitId);
  const won = engine.winner === 'player';

  cascade.allMatches.push({
    unitLabel: unit.label,
    opponentLabel: pending.guardianRef ? pending.guardianRef.name : unitById.get(pending.defenderId).label,
    target: pending.target,
    kind: pending.guardianRef ? 'guardian' : 'challengeMatch',
    engineState: engine,
    memberIds: unit.memberIds,
  });
  recordPart2Result(s, byId, unit, won);
  if (won) {
    if (pending.defenderId) {
      const defender = unitById.get(pending.defenderId);
      recordPart2Result(s, byId, defender, false);
      const oldRank = unit.courtRank;
      const occupants = cascade.courts[pending.target];
      const idx = occupants.indexOf(pending.defenderId);
      if (idx >= 0) occupants.splice(idx, 1);
      movePart2UnitTo(cascade, unit, pending.target);
      movePart2UnitTo(cascade, defender, oldRank);
    } else {
      movePart2UnitTo(cascade, unit, pending.target);
    }
    cascade.anyMoveThisPass = true;
  }
  reportSparks(s, engine);
  cascade.pendingChallenge = null;
  s.battleContext = null;
  return driveCascade(s);
}

export function advancePart2Highlight(state) {
  const s = deepClone(state);
  const sim = s.part2.simResult;
  sim.highlightIndex += 1;
  if (sim.highlightIndex >= sim.highlightMatches.length) s.screen = 'part2OverallResult';
  return s;
}

export function finishPart2Overall(state) {
  const s = deepClone(state);
  s.screen = s.part2.cleared ? 'part2Cleared' : 'part2Finished';
  return s;
}

// 保存庫は消費されないので、同じ／別の編成であらためて挑戦をやり直せる。
export function restartPart2(state) {
  const s = deepClone(state);
  s.part2 = null;
  s.screen = 'part2SquadSelect';
  return s;
}

// 進行状況に応じて第2部の適切な画面へ戻る（ヘッダーの「第2部へ」から使用）。
export function resumePart2(state) {
  const s = deepClone(state);
  if (!s.part2) { s.screen = 'part2SquadSelect'; return s; }
  if (s.battleContext && s.battleContext.type === 'part2Match') { s.screen = 'battle'; return s; }
  if (!s.part2.simResult) { s.screen = 'part2RoleAssign'; return s; }
  s.screen = s.part2.cleared ? 'part2Cleared' : 'part2Finished';
  return s;
}

export function exitPart2ToPart1(state) {
  const s = deepClone(state);
  return resumeMainFlow(s);
}

// ------------------------------------------------------------
// 第3部：世界戦編
// 第2部で5番コート以内に到達したメンバーで世界代表チームを編成する。
// 1次リーグ・2次リーグは各3試合（選手重複不可）、準々決勝以降は同じ8人を使い回せる一発勝負。
// 準決勝はスペインかアメリカ、決勝はドイツで固定。各対戦の前に出場選手へランダムに負傷が発生する。
// ------------------------------------------------------------
export function canEnterPart3(state) { return !!(state.part2 && state.part2.cleared); }

function pushPart3Log(s, msg) { s.part3.log = [msg, ...s.part3.log].slice(0, 80); }

// 現在のロースター編成キー（1次/2次リーグはステージごと、準々決勝以降は共通の"knockout"）を返す。
function part3RosterKey(stage) { return (stage === 'league1' || stage === 'league2') ? stage : 'knockout'; }

function buildPart3Squad(state) {
  return state.part2.squad.filter((m) => m.courtRank <= COURT_CLEAR_THRESHOLD).map(makePart3SquadMember);
}

export function goToPart3Start(state) {
  const s = deepClone(state);
  if (!s.part3) {
    const squad = buildPart3Squad(s);
    s.part3 = {
      squad,
      stage: 'league1',
      roundIndex: 0,
      rosterPlans: { league1: null, league2: null, knockout: null },
      leagueResults: { league1: [], league2: [] },
      semiCountry: null,
      usedCountries: [],
      leagueAppearances: [],
      currentTie: null,
      outcome: null,
      eliminatedAt: null,
      log: [`世界代表${squad.length}人で世界戦に出発した。まずは1次リーグの出場ロースターを決めよう。`],
      lastScreen: 'part3RosterPlan',
    };
  }
  s.screen = s.part3.lastScreen;
  return s;
}

function baseStatOfIds(byId, ids) {
  if (ids.length === 1) return statTotal(byId.get(ids[0]));
  return (statTotal(byId.get(ids[0])) + statTotal(byId.get(ids[1]))) / 2;
}

// 選ばれた8人ロースターと対戦国から、6ポジション分の対戦カードを組み立てる。
function buildPart3Tie(s, stage, roundIndex, plan, country) {
  const multiplier = WORLD_STAGE_MULT[stage];
  const byId = new Map(s.part3.squad.map((m) => [m.id, m]));
  const positions = WORLD_POSITIONS.map((pos) => {
    const ids = pos.type === 'singles' ? [plan[pos.key]] : plan[pos.key];
    const opponent = generateWorldOpponent(country, multiplier, baseStatOfIds(byId, ids), pos.label);
    return { ...pos, playerIds: ids, opponent, result: null };
  });
  return { stage, roundIndex, country, positions, posIndex: -1, score: { player: 0, opponent: 0 }, result: null };
}

function planPlayerIds(plan) {
  return [plan.s1, plan.s2, plan.s3, plan.s4, ...plan.d1, ...plan.d2];
}

// ロースター確定（1次/2次リーグは3試合分、準々決勝以降は1試合分＝以後使い回し）を受けて最初の対戦を始める。
// 1次/2次リーグで出場した選手は、準々決勝前の負傷判定（advancePart3AfterStageResult）の対象として記録しておく。
export function confirmPart3RosterPlan(state, plans) {
  const s = deepClone(state);
  const p3 = s.part3;
  const key = part3RosterKey(p3.stage);
  p3.rosterPlans[key] = plans;
  p3.roundIndex = 0;
  if (key === 'league1' || key === 'league2') {
    const ids = new Set(p3.leagueAppearances);
    plans.forEach((plan) => planPlayerIds(plan).forEach((id) => ids.add(id)));
    p3.leagueAppearances = [...ids];
  }
  return startPart3Tie(s);
}

function startPart3Tie(s) {
  const p3 = s.part3;
  const key = part3RosterKey(p3.stage);
  const plan = p3.rosterPlans[key][key === 'knockout' ? 0 : p3.roundIndex];

  let country;
  if (p3.stage === 'semi') {
    if (!p3.semiCountry) p3.semiCountry = pick(WORLD_SEMI_CANDIDATES);
    country = p3.semiCountry;
  } else if (p3.stage === 'final') {
    country = WORLD_FINAL_COUNTRY;
  } else {
    [country] = pickRandomCountries(1, p3.usedCountries);
    p3.usedCountries.push(country);
  }

  p3.currentTie = buildPart3Tie(s, p3.stage, p3.roundIndex, plan, country);
  pushPart3Log(s, `${WORLD_STAGE_LABEL[p3.stage]} vs ${country}代表、対戦開始！`);
  return advancePart3Position(s);
}

// 次のポジションへ進め、バトル画面を開く。スコアが4に達したら（6ポジション中の過半数）その時点で対戦を打ち切る。
function advancePart3Position(s) {
  const tie = s.part3.currentTie;
  tie.posIndex += 1;
  if (tie.posIndex >= tie.positions.length) return finalizePart3Tie(s);
  const byId = new Map(s.part3.squad.map((m) => [m.id, m]));
  const pos = tie.positions[tie.posIndex];
  const ref = pos.type === 'singles'
    ? byId.get(pos.playerIds[0])
    : makeDoublesRef(byId.get(pos.playerIds[0]), byId.get(pos.playerIds[1]));
  s.battleContext = { type: 'worldTie', engineState: newBattleState(ref, pos.opponent, Math.random() < 0.5 ? 'player' : 'opponent') };
  s.screen = 'battle';
  return s;
}

export function afterWorldPositionMatch(state) {
  const s = deepClone(state);
  const engine = s.battleContext.engineState;
  const tie = s.part3.currentTie;
  const pos = tie.positions[tie.posIndex];
  const won = engine.winner === 'player';
  pos.result = won ? 'win' : 'lose';
  tie.score[won ? 'player' : 'opponent'] += 1;
  const byId = new Map(s.part3.squad.map((m) => [m.id, m]));
  pos.playerIds.forEach((id) => {
    const m = byId.get(id);
    if (!m) return;
    m.part3Record[won ? 'wins' : 'losses'] += 1;
    if (won) rollSkillGrowth(m, 0.1);
  });
  reportSparks(s, engine);
  pushPart3Log(s, `${pos.label}: ${won ? '勝利' : '敗北'}（${tie.country}戦 ${tie.score.player}-${tie.score.opponent}）`);
  s.battleContext = null;
  if (tie.score.player >= 4 || tie.score.opponent >= 4) return finalizePart3Tie(s);
  return advancePart3Position(s);
}

function finalizePart3Tie(s) {
  const tie = s.part3.currentTie;
  const wonTie = tie.score.player > tie.score.opponent;
  tie.result = wonTie ? 'win' : 'lose';
  pushPart3Log(s, `${WORLD_STAGE_LABEL[tie.stage]} vs ${tie.country}：${wonTie ? '勝利！' : '敗北…'}（${tie.score.player}-${tie.score.opponent}）`);
  s.screen = 'part3TieResult';
  s.part3.lastScreen = 'part3TieResult';
  return s;
}

// 対戦結果画面の「次へ」。リーグ戦なら次の試合（または3試合終えてステージ判定）、
// 決勝トーナメントなら勝敗に応じて次ステージ or 敗退へ進む。
export function advancePart3AfterTieResult(state) {
  const s = deepClone(state);
  const p3 = s.part3;
  const tie = p3.currentTie;
  const stage = tie.stage;

  if (stage === 'league1' || stage === 'league2') {
    p3.leagueResults[stage].push(tie.result);
    p3.currentTie = null;
    if (p3.roundIndex < WORLD_LEAGUE_ROUNDS - 1) {
      p3.roundIndex += 1;
      return startPart3Tie(s);
    }
    const wins = p3.leagueResults[stage].filter((r) => r === 'win').length;
    if (wins < 2) { p3.outcome = 'eliminated'; p3.eliminatedAt = stage; }
    s.screen = 'part3StageResult';
    p3.lastScreen = 'part3StageResult';
    return s;
  }

  // 準々決勝／準決勝／決勝：1試合1発勝負
  p3.currentTie = null;
  if (tie.result === 'lose') {
    p3.outcome = 'eliminated';
    p3.eliminatedAt = stage;
    s.screen = 'part3Eliminated';
    p3.lastScreen = 'part3Eliminated';
    return s;
  }
  if (stage === 'final') {
    p3.outcome = 'champion';
    s.screen = 'part3Champion';
    p3.lastScreen = 'part3Champion';
    return s;
  }
  p3.stage = stage === 'quarter' ? 'semi' : 'final';
  p3.roundIndex = 0;
  return startPart3Tie(s);
}

// 1次・2次リーグを通じて出場したことのある選手全員に、準々決勝直前でまとめて負傷判定を行う。
// 1次・2次リーグの試合中は一切負傷しない代わりに、ここでそれまでの疲労が一気に選手たちを襲う。
// 負傷した選手は準々決勝以降のロースターに選抜できなくなる（試合中の不戦敗にはならない）。
function applyPart3PreQuarterInjuries(s) {
  const p3 = s.part3;
  const byId = new Map(p3.squad.map((m) => [m.id, m]));
  const injuredNames = [];
  p3.leagueAppearances.forEach((id) => {
    const m = byId.get(id);
    if (!m || m.part3Withdrawn) return;
    const severity = rollPart3Injury();
    if (severity === 'none') return;
    m.part3Withdrawn = true;
    injuredNames.push(m.name);
  });
  if (injuredNames.length) {
    pushPart3Log(s, `準々決勝を前に${injuredNames.length}人が負傷…（${injuredNames.join('、')}）。以後のロースターには選べない。`);
  } else {
    pushPart3Log(s, '準々決勝を前に、負傷者は出なかった。');
  }
}

// リーグ全3試合の結果画面（part3StageResult）の「次へ」。敗退ならそのまま敗退画面、
// 突破なら次ステージのロースター編成画面へ（league2→quarterの場合はここで負傷イベントを発生させる）。
export function advancePart3AfterStageResult(state) {
  const s = deepClone(state);
  const p3 = s.part3;
  if (p3.outcome === 'eliminated') { s.screen = 'part3Eliminated'; p3.lastScreen = 'part3Eliminated'; return s; }
  const nextStage = p3.stage === 'league1' ? 'league2' : 'quarter';
  if (nextStage === 'quarter') applyPart3PreQuarterInjuries(s);
  p3.stage = nextStage;
  p3.roundIndex = 0;
  s.screen = 'part3RosterPlan';
  p3.lastScreen = 'part3RosterPlan';
  return s;
}

// 保存庫は消費されないので、第2部の結果さえ変わらなければ同じ代表チームで再挑戦できる。
export function restartPart3(state) {
  const s = deepClone(state);
  s.part3 = null;
  return goToPart3Start(s);
}

// 進行状況に応じて第3部の適切な画面へ戻る（ヘッダーの「第3部へ」から使用）。
export function resumePart3(state) {
  const s = deepClone(state);
  if (!s.part3) return goToPart3Start(s);
  if (s.battleContext && s.battleContext.type === 'worldTie') { s.screen = 'battle'; return s; }
  s.screen = s.part3.lastScreen;
  return s;
}

export function exitPart3ToPart1(state) {
  const s = deepClone(state);
  return resumeMainFlow(s);
}

// 第1部（部内戦→大会のループ）に、進行中の内容へ応じて適切な画面で復帰する
// （第2部・第3部からヘッダー経由で戻ってくる場合に使用）。
function resumeMainFlow(s) {
  if (s.team.length === 0) { s.screen = 'graduationResult'; return s; }
  if (s.battleContext) { s.screen = 'battle'; return s; }
  if (s.teamMatch) { s.screen = 'teamMatchResult'; return s; }
  if (s.lineup) { s.screen = 'lineup'; return s; }
  if (s.individualTournament) { s.screen = 'individualRound'; return s; }
  if (s.squadSelectionMatches) { s.screen = 'squadSelectionMatches'; return s; }
  if (s.squadSelectionResult) { s.screen = 'squadSelectionResult'; return s; }
  if (s.pendingSeason) { s.screen = 'squadSelection'; return s; }
  runToNextSeason(s);
  return s;
}

const PART2_SCREENS = new Set([
  'part2SquadSelect', 'part2RoleAssign', 'part2Highlight', 'part2OverallResult', 'part2Cleared', 'part2Finished',
]);
const PART3_SCREENS = new Set([
  'part3RosterPlan', 'part3TieResult', 'part3StageResult', 'part3Eliminated', 'part3Champion',
]);

// 現在の画面がどの部（第1部／第2部／第3部）に属するかを判定する。
// ヘッダーのメニュー表示や「メンバー一覧」に載せるロースターの出し分けに使う。
export function currentPart(state) {
  if (state.screen === 'battle' && state.battleContext?.type === 'worldTie') return 'part3';
  if (PART3_SCREENS.has(state.screen)) return 'part3';
  if (state.screen === 'battle' && state.battleContext?.type === 'part2Match') return 'part2';
  if (PART2_SCREENS.has(state.screen)) return 'part2';
  return 'part1';
}
