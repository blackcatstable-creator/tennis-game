// ============================================================
// battle.js — コマンドバトル・エンジン（企画書 2.2〜2.4 に対応）
// ============================================================
import {
  clamp, rand, randInt, styleMultiplier, handMultiplier, hitPointMultiplier, trySparkSkill, tryLevelUpSkill,
  SKILL_STAT, SKILL_AWAKEN_BONUS, personalityOf, PERSONALITY_TRAITS, STYLE_SKILL_AFFINITY,
  getTitlePassiveMods,
} from './data.js';

// 二つ名パッシブ（企画書3.5）の解決ヘルパー。combatant.ref の二つ名から該当hookのmodだけを絞り込む。
function titleMods(combatant, hook, filter) {
  const mods = getTitlePassiveMods(combatant.ref).filter((m) => m.hook === hook);
  return filter ? mods.filter(filter) : mods;
}
// value(=倍率の差分)を base に順に掛け合わせる。例: value=0.12 → ×1.12、value=-0.2 → ×0.8
function applyMult(base, mods) {
  return mods.reduce((v, m) => v * (1 + m.value), base);
}

export function pointLabel(n) { return ['0', '15', '30', '40'][Math.max(0, Math.min(n, 3))]; }

export const COMMAND_LABEL = { stroke: 'ストローク', net: 'ネットプレー', defense: 'ディフェンス', skill: '必殺技' };
const COMMAND_COEF = {
  stroke: { atk: 1.0, def: 1.0 },
  net: { atk: 1.35, def: 0.8 },
  defense: { atk: 0.7, def: 1.35 },
  skill: { atk: 1.9, def: 1.15 },
};
const COMMAND_STAMINA_COST = { stroke: 5, net: 8, defense: 3, skill: 10 };
const JUDGE_THRESHOLD = 8;
const MAX_TURNS_PER_POINT = 10;

function makeCombatant(ref) {
  return { ref, stamina: 100, tension: 0, mental: 100 };
}

export function newBattleState(playerRef, opponentRef, serverSide) {
  return {
    player: makeCombatant(playerRef),
    opponent: makeCombatant(opponentRef),
    server: serverSide || 'player',
    turnAttacker: serverSide || 'player',
    points: { player: 0, opponent: 0 },
    games: { player: 0, opponent: 0 },
    sets: { player: 0, opponent: 0 },
    totalGames: { player: 0, opponent: 0 }, // セットをまたいだ通算ゲーム数（ターン数上限での強制判定に使う）
    turnCount: 0,
    matchOver: false,
    winner: null,
    log: [],
    scoreHistory: [], // logと同じ長さ。各行が積まれた直後のスコアのスナップショット（再生アニメーション用）
    sparks: [],
    turnSeq: 0,
    lastTurn: null, // 直近のターン結果（演出用の構造化データ。ログ文字列のパースを避けるため）
  };
}

// ログ行を積むと同時に、その時点のスコアをscoreHistoryへ記録する（logとscoreHistoryは常に同じ長さになる）。
function pushMatchLog(state, line) {
  state.log.push(line);
  state.scoreHistory.push({
    points: { ...state.points },
    games: { ...state.games },
    sets: { ...state.sets },
  });
}

// 「完成された基礎」等のconditionResistパッシブは、スタミナ・メンタル低下によるペナルティを
// 1.0側へvalue割合だけ引き戻す（例: value=0.5でペナルティ半減）。
function applyConditionResist(c, factor) {
  const resist = titleMods(c, 'conditionResist')[0];
  if (!resist) return factor;
  return factor + (1 - factor) * clamp(resist.value, 0, 1);
}
function staminaFactor(c) { return applyConditionResist(c, 0.5 + 0.5 * clamp(c.stamina, 0, 100) / 100); }
function mentalFactor(c) { return applyConditionResist(c, c.mental <= 0 ? 0.7 : 1.0); }

function baseShotPower(combatant, cmd) {
  const st = combatant.ref.stats;
  if (cmd.type === 'stroke') return st.pow * 0.5 + st.spin * 0.3 + st.sta * 0.2;
  if (cmd.type === 'net') return st.spd * 0.4 + st.tech * 0.4 + st.men * 0.2;
  if (cmd.type === 'defense') return st.rea * 0.4 + st.sta * 0.3 + st.read * 0.3;
  if (cmd.type === 'skill') {
    const catStat = SKILL_STAT[cmd.skill.category];
    const lvBonus = (cmd.skill.level - 1) * 8 + (cmd.skill.awakened ? SKILL_AWAKEN_BONUS : 0);
    return 62 + st[catStat] * 0.55 + lvBonus;
  }
  return 0;
}

// 相性補正（企画書2.6）：プレースタイルの4すくみに加え、利き手・打点の高低という細目相性も加味する。
function compatMultiplier(attackerRef, defenderRef) {
  return styleMultiplier(attackerRef.style, defenderRef.style)
    * handMultiplier(attackerRef.hand, defenderRef.hand)
    * hitPointMultiplier(attackerRef.hitPoint, defenderRef.hitPoint);
}

function attackJudge(attacker, cmd, defenderRef, state) {
  const base = baseShotPower(attacker, cmd) * COMMAND_COEF[cmd.type].atk;
  let compat = base * (compatMultiplier(attacker.ref, defenderRef) - 1);
  // 「針の穴を通す一打」等のcompatMultは、相性有利で生じたボーナス分だけを増幅する（不利側は増幅しない）。
  if (compat > 0) compat = applyMult(compat, titleMods(attacker, 'compatMult'));
  const tensionBonus = attacker.tension * 0.15;
  let val = (base + compat + tensionBonus) * staminaFactor(attacker) * mentalFactor(attacker);
  val = applyMult(val, titleMods(attacker, 'atkMult', (m) => !m.cmd || m.cmd === cmd.type));
  if (state && isClutch(state)) val = applyMult(val, titleMods(attacker, 'clutchAtkMult'));
  return val * rand(0.9, 1.1);
}

function returnJudge(defender, cmd) {
  const reactionBase = defender.ref.stats.rea * COMMAND_COEF[cmd.type].def;
  const readBonus = defender.ref.stats.read * 0.4;
  const tensionBonus = defender.tension * 0.15;
  let val = (reactionBase + readBonus + tensionBonus) * staminaFactor(defender) * mentalFactor(defender);
  val = applyMult(val, titleMods(defender, 'defMult', (m) => !m.cmd || m.cmd === cmd.type));
  return val * rand(0.9, 1.1);
}

// 「コートの魔術師」等のskillCostMultパッシブを織り込んだ、必殺技の実消費テンション。
function effectiveSkillCost(combatant, skill) {
  return Math.max(1, Math.round(applyMult(skill.cost, titleMods(combatant, 'skillCostMult'))));
}

function skillUsable(combatant, skill) {
  return combatant.mental > 0 && combatant.tension >= effectiveSkillCost(combatant, skill);
}

// プレースタイルごとの基本的な攻め筋・受け筋（ロール別のコマンド重み）。
// allroundの数値は旧実装の固定確率（攻撃時net45%、防御時net22%/defense38%/stroke40%）をそのまま踏襲している。
const STYLE_TENDENCY = {
  power: { attack: { net: 0.55, stroke: 0.45 }, defense: { net: 0.35, stroke: 0.25, defense: 0.40 } },
  speed: { attack: { net: 0.65, stroke: 0.35 }, defense: { net: 0.30, stroke: 0.30, defense: 0.40 } },
  technique: { attack: { net: 0.30, stroke: 0.70 }, defense: { net: 0.15, stroke: 0.45, defense: 0.40 } },
  counter: { attack: { net: 0.20, stroke: 0.80 }, defense: { net: 0.10, stroke: 0.25, defense: 0.65 } },
  allround: { attack: { net: 0.45, stroke: 0.55 }, defense: { net: 0.22, stroke: 0.40, defense: 0.38 } },
};

function pickWeighted(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + Math.max(w, 0), 0);
  let roll = Math.random() * total;
  for (const [type, w] of entries) {
    roll -= Math.max(w, 0);
    if (roll <= 0) return type;
  }
  return entries[entries.length - 1][0];
}

// 選手の性格（energy=気性の激しさ/discipline=冷静さ・計算高さ）とプレースタイルから、
// コマンド選択の傾向を細かく変化させる。同じスタイルでも性格が違えば挙動が変わり、
// 同じ性格でもスタイルが違えば選ぶ手が変わるようにしている。
function aiChooseCommand(self, opp, role) {
  const traits = PERSONALITY_TRAITS[personalityOf(self.ref)];
  const aggro = (traits.energy - 5) / 5; // -0.8〜+0.8: 高いほど攻撃的・無謀
  const poise = (traits.discipline - 5) / 5; // -0.6〜+0.8: 高いほど冷静・計算高い、低いほど衝動的

  const usable = (self.ref.skills || []).filter((sk) => skillUsable(self, sk));
  if (usable.length) {
    const affinityCategory = STYLE_SKILL_AFFINITY[self.ref.style];
    const hasAffinitySkill = usable.some((s) => s.category === affinityCategory);
    const skillChance = clamp(0.4 + aggro * 0.12 - poise * 0.05 + (hasAffinitySkill ? 0.08 : 0), 0.12, 0.7);
    if (Math.random() < skillChance) {
      // 冷静なタイプは最も熟練した（レベルの高い）技を堅実に選び、衝動的なタイプは一番コストの重い派手な技に頼る。
      const skill = poise > 0.2
        ? usable.reduce((best, s) => (s.level > best.level || (s.level === best.level && s.cost > best.cost) ? s : best), usable[0])
        : usable.reduce((best, s) => (s.cost > best.cost ? s : best), usable[0]);
      return { type: 'skill', skill };
    }
  }

  // スタミナを温存する閾値も性格次第：冷静なタイプは早めに守りに入り、気性が激しいタイプは無理を続ける。
  const staminaGuard = clamp(25 + poise * 10 - aggro * 8, 12, 42);
  if (self.stamina < staminaGuard) return { type: 'defense' };

  const tendency = STYLE_TENDENCY[self.ref.style] || STYLE_TENDENCY.allround;
  const base = role === 'attack' ? tendency.attack : tendency.defense;
  const weights = { ...base };
  weights.net = Math.max(weights.net * (1 + aggro * 0.35), 0.02);
  if ('stroke' in weights) weights.stroke = Math.max(weights.stroke * (1 - aggro * 0.15), 0.02);
  if ('defense' in weights) weights.defense = Math.max(weights.defense * (1 - aggro * 0.3 + poise * 0.25), 0.02);

  // 規律の低い性格ほど一定確率でセオリーを無視した気まぐれな選択をする（ムードメーカー・天然など）。
  const erraticChance = clamp((5 - traits.discipline) * 0.04, 0, 0.3);
  if (Math.random() < erraticChance) {
    const keys = Object.keys(weights);
    return { type: keys[randInt(0, keys.length - 1)] };
  }

  return { type: pickWeighted(weights) };
}

export function isClutch(state) {
  const p = state.points, g = state.games, s = state.sets;
  const closeGame = Math.max(p.player, p.opponent) >= 3 && Math.abs(p.player - p.opponent) <= 1;
  const closeSet = Math.max(g.player, g.opponent) >= 5;
  const closeMatch = Math.max(s.player, s.opponent) >= 1;
  return closeGame && (closeSet || closeMatch);
}

// マッチポイント等の競った局面で低確率発動する「試合中覚醒」。既存技のレベルアップを優先し、
// 空き枠があれば新規習得も起こる（企画書2.4の習得ルート2）。
function maybeGrowSkillClutch(state, side) {
  const combatant = state[side];
  const owner = combatant.ref;
  if (!owner.skills) return null;
  if (!isClutch(state)) return null;
  if (Math.random() >= 0.07) return null;
  const upgradable = owner.skills.some((s) => s.level < 3);
  let grown = null;
  let type = null;
  if (upgradable && (owner.skills.length >= 4 || Math.random() < 0.5)) {
    grown = tryLevelUpSkill(owner);
    type = 'levelup';
  } else if (owner.skills.length < 4) {
    grown = trySparkSkill(owner);
    type = 'new';
  }
  if (grown) state.sparks.push({ side, type, skill: grown });
  return grown;
}

function atkNameOf(state, side) { return state[side].ref.name; }

// 1ターン分の判定を解決する。cmdAtk/cmdDef はそれぞれ現在の攻撃側・防御側のコマンド。
function resolveTurn(state, cmdAtk, cmdDef) {
  const atkSide = state.turnAttacker;
  const defSide = atkSide === 'player' ? 'opponent' : 'player';
  const attacker = state[atkSide];
  const defender = state[defSide];

  if (cmdAtk.type === 'skill') attacker.tension = clamp(attacker.tension - effectiveSkillCost(attacker, cmdAtk.skill), 0, 100);
  if (cmdDef.type === 'skill') defender.tension = clamp(defender.tension - effectiveSkillCost(defender, cmdDef.skill), 0, 100);

  const aj = attackJudge(attacker, cmdAtk, defender.ref, state);
  const rj = returnJudge(defender, cmdDef);
  const diff = aj - rj;

  let outcome;
  if (state.turnCount >= MAX_TURNS_PER_POINT - 1) {
    outcome = aj >= rj ? 'atk_point' : 'def_point';
  } else if (diff >= JUDGE_THRESHOLD) {
    outcome = 'atk_point';
  } else if (-diff >= JUDGE_THRESHOLD) {
    outcome = 'def_point';
  } else {
    outcome = 'continue';
  }

  const atkStaminaCost = applyMult(
    COMMAND_STAMINA_COST[cmdAtk.type],
    titleMods(attacker, 'staminaCostMult', (m) => m.role === 'atk' && (!m.cmd || m.cmd === cmdAtk.type)),
  );
  const defStaminaCost = applyMult(
    COMMAND_STAMINA_COST[cmdDef.type] * 0.8,
    titleMods(defender, 'staminaCostMult', (m) => m.role === 'def' && (!m.cmd || m.cmd === cmdDef.type)),
  );
  attacker.stamina = clamp(attacker.stamina - atkStaminaCost, 0, 100);
  defender.stamina = clamp(defender.stamina - defStaminaCost, 0, 100);

  let log = `${atkNameOf(state, atkSide)}の${COMMAND_LABEL[cmdAtk.type]}${cmdAtk.type === 'skill' ? `『${cmdAtk.skill.name}』` : ''} vs ${atkNameOf(state, defSide)}の${COMMAND_LABEL[cmdDef.type]}`;

  if (outcome === 'atk_point') {
    const tGain = applyMult(15, titleMods(attacker, 'tensionGainMult'));
    const mLoss = applyMult(3, titleMods(defender, 'mentalLossMult'));
    attacker.tension = clamp(attacker.tension + tGain, 0, 100);
    defender.tension = clamp(defender.tension - 5, 0, 100);
    defender.mental = clamp(defender.mental - mLoss, 0, 100);
    log += ` → ${atkNameOf(state, atkSide)}が決めた！`;
  } else if (outcome === 'def_point') {
    const tGain = applyMult(20, titleMods(defender, 'tensionGainMult'));
    const mLoss = applyMult(5, titleMods(attacker, 'mentalLossMult'));
    defender.tension = clamp(defender.tension + tGain, 0, 100);
    attacker.mental = clamp(attacker.mental - mLoss, 0, 100);
    attacker.tension = clamp(attacker.tension - 8, 0, 100);
    log += ` → ${atkNameOf(state, defSide)}が切り返した！`;
  } else {
    attacker.tension = clamp(attacker.tension + 4, 0, 100);
    defender.tension = clamp(defender.tension + 4, 0, 100);
    log += ' → ラリー継続';
  }

  state.turnSeq = (state.turnSeq || 0) + 1;
  state.lastTurn = {
    seq: state.turnSeq,
    atkSide,
    defSide,
    atkSkillName: cmdAtk.type === 'skill' ? cmdAtk.skill.name : null,
    defSkillName: cmdDef.type === 'skill' ? cmdDef.skill.name : null,
    outcome,
    winnerSide: null,
    gameWon: false,
    setWon: false,
    matchWon: false,
  };

  return { outcome, atkSide, defSide, log };
}

function applyPointResult(state, winnerSide, rallyLog) {
  const pointInfo = { winnerSide, gameWon: false, setWon: false, matchWon: false };
  state.points[winnerSide] += 1;
  const p = state.points;
  // ゲーム獲得によるポイントのリセット前に、ポイントが動いた瞬間のスコアでラリー描写行を記録する。
  pushMatchLog(state, rallyLog);
  if (p[winnerSide] >= 4 && p[winnerSide] - p[winnerSide === 'player' ? 'opponent' : 'player'] >= 1) {
    pointInfo.gameWon = true;
    state.games[winnerSide] += 1;
    if (!state.totalGames) state.totalGames = { player: 0, opponent: 0 };
    state.totalGames[winnerSide] += 1;
    state.points = { player: 0, opponent: 0 };
    pushMatchLog(state, `ゲーム獲得: ${atkNameOf(state, winnerSide)} (${state.games.player}-${state.games.opponent})`);
    if (state.games[winnerSide] >= 6) {
      pointInfo.setWon = true;
      state.sets[winnerSide] += 1;
      state.games = { player: 0, opponent: 0 };
      const loserSide = winnerSide === 'player' ? 'opponent' : 'player';
      state[loserSide].mental = clamp(state[loserSide].mental - 10, 0, 100);
      state[winnerSide].mental = clamp(state[winnerSide].mental + 5, 0, 100);
      pushMatchLog(state, `セット獲得: ${atkNameOf(state, winnerSide)} (セット ${state.sets.player}-${state.sets.opponent})`);
      if (state.sets[winnerSide] >= 2) {
        pointInfo.matchWon = true;
        state.matchOver = true;
        state.winner = winnerSide;
        pushMatchLog(state, `${atkNameOf(state, winnerSide)}の勝利！`);
      }
    }
    state.server = state.server === 'player' ? 'opponent' : 'player';
  }
  state.turnAttacker = state.server;
  state.turnCount = 0;
  if (state.lastTurn) Object.assign(state.lastTurn, pointInfo);
  return pointInfo;
}

// プレイヤー側のコマンドを1つ確定し、相手はAIで応手させて1ターン進める。
export function submitPlayerCommand(state, playerCmd) {
  if (state.matchOver) return state;
  const playerRole = state.turnAttacker === 'player' ? 'attack' : 'defense';
  const oppRole = playerRole === 'attack' ? 'defense' : 'attack';
  const opponentCmd = aiChooseCommand(state.opponent, state.player, oppRole);

  const cmdAtk = playerRole === 'attack' ? playerCmd : opponentCmd;
  const cmdDef = playerRole === 'attack' ? opponentCmd : playerCmd;

  const result = resolveTurn(state, cmdAtk, cmdDef);

  if (result.outcome === 'continue') {
    pushMatchLog(state, result.log);
    state.turnAttacker = state.turnAttacker === 'player' ? 'opponent' : 'player';
    state.turnCount += 1;
  } else {
    const winnerSide = result.outcome === 'atk_point' ? result.atkSide : result.defSide;
    applyPointResult(state, winnerSide, result.log);
    maybeGrowSkillClutch(state, 'player');
  }
  return state;
}

// 両者AIで1ターン進める（フルオート用）
export function autoAdvanceOneTurn(state) {
  const attackerSide = state.turnAttacker;
  const defenderSide = attackerSide === 'player' ? 'opponent' : 'player';
  const cmdAtk = aiChooseCommand(state[attackerSide], state[defenderSide], 'attack');
  const cmdDef = aiChooseCommand(state[defenderSide], state[attackerSide], 'defense');
  const result = resolveTurn(state, cmdAtk, cmdDef);
  if (result.outcome === 'continue') {
    pushMatchLog(state, result.log);
    state.turnAttacker = state.turnAttacker === 'player' ? 'opponent' : 'player';
    state.turnCount += 1;
  } else {
    const winnerSide = result.outcome === 'atk_point' ? result.atkSide : result.defSide;
    applyPointResult(state, winnerSide, result.log);
    maybeGrowSkillClutch(state, 'player');
    maybeGrowSkillClutch(state, 'opponent');
  }
  return state;
}

export function autoFinishMatch(state) {
  let guard = 0;
  while (!state.matchOver && guard < 4000) {
    autoAdvanceOneTurn(state);
    guard += 1;
  }
  return state;
}

export function simulateWholeMatch(playerRef, opponentRef, serverSide) {
  const state = newBattleState(playerRef, opponentRef, serverSide);
  return autoFinishMatch(state);
}

// 通常のセット制決着に加えて、指定ターン数で強制的に決着させる（互角なら通算ゲーム数→現在セットのゲーム数→
// 現在のポイント数→ランダムの順でタイブレークする）。第2部のコート変更を賭けた挑戦で使用する。
function decideForcedWinner(state) {
  if (state.totalGames.player !== state.totalGames.opponent) {
    return state.totalGames.player > state.totalGames.opponent ? 'player' : 'opponent';
  }
  if (state.games.player !== state.games.opponent) {
    return state.games.player > state.games.opponent ? 'player' : 'opponent';
  }
  if (state.points.player !== state.points.opponent) {
    return state.points.player > state.points.opponent ? 'player' : 'opponent';
  }
  return Math.random() < 0.5 ? 'player' : 'opponent';
}

export function simulateCappedMatch(playerRef, opponentRef, serverSide, maxTurns) {
  const cap = maxTurns || 50;
  const state = newBattleState(playerRef, opponentRef, serverSide);
  let turns = 0;
  while (!state.matchOver && turns < cap) {
    autoAdvanceOneTurn(state);
    turns += 1;
  }
  if (!state.matchOver) {
    const winner = decideForcedWinner(state);
    state.matchOver = true;
    state.winner = winner;
    pushMatchLog(state, `${cap}ターン終了。通算ゲーム数 ${state.totalGames.player}-${state.totalGames.opponent} で${state[winner].ref.name}の判定勝ち！`);
  }
  return state;
}

export function playerUsableSkills(state) {
  if (!state || state.matchOver) return [];
  return (state.player.ref.skills || []).filter((sk) => skillUsable(state.player, sk));
}
