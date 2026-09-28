// ============================================================
// data.js — 定数・マスタデータ・汎用ユーティリティ
// ============================================================

export function rand(min, max) { return Math.random() * (max - min) + min; }
export function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
export function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

// weights = { key: weight, ... }。weightsがnull/未指定ならkeysから均等に選ぶ。
export function weightedPick(keys, weights) {
  if (!weights) return pick(keys);
  const total = keys.reduce((sum, k) => sum + Math.max(0, weights[k] ?? 1), 0);
  let r = Math.random() * total;
  for (const k of keys) {
    r -= Math.max(0, weights[k] ?? 1);
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}

export const STATS = ['pow', 'spd', 'sta', 'tech', 'rea', 'spin', 'men', 'read'];
export const STAT_LABEL = {
  pow: 'パワー', spd: 'スピード', sta: 'スタミナ', tech: '技術',
  rea: '反応', spin: 'スピン', men: 'メンタル', read: '読み',
};

export const STYLES = ['power', 'speed', 'technique', 'counter', 'allround'];
export const STYLE_LABEL = {
  power: 'パワー型', speed: 'スピード型', technique: 'テクニック型',
  counter: 'カウンター型', allround: 'オールラウンド型',
};
// パワー→テクニック→スピード→カウンター→パワー の4すくみ。オールラウンドは常に中立。
const STYLE_ADV = { power: 'technique', technique: 'speed', speed: 'counter', counter: 'power' };
export function styleMultiplier(atkStyle, defStyle) {
  if (STYLE_ADV[atkStyle] === defStyle) return 1.15;
  if (STYLE_ADV[defStyle] === atkStyle) return 0.87;
  return 1.0;
}

// 利き手：左利きは対策されにくく、右利き相手にはわずかに有利。左利き同士・右利き相手の左利きには弱点がない。
export const HANDS = ['right', 'left'];
export const HAND_LABEL = { right: '右利き', left: '左利き' };
export function handMultiplier(atkHand, defHand) {
  if (atkHand === 'left' && defHand === 'right') return 1.08;
  if (atkHand === 'right' && defHand === 'left') return 0.94;
  return 1.0;
}
// 右利き相手には左利きが有利を取れる。左利き相手には明確な対策がない（＝左利きの強み）。
export function counterHandOf(hand) { return hand === 'right' ? 'left' : null; }

// 打点の高低：高打点は角度・威力で押し込みやすく、低打点の相手にはわずかに有利。
export const HIT_POINTS = ['high', 'low'];
export const HIT_POINT_LABEL = { high: '高打点', low: '低打点' };
export function hitPointMultiplier(atkHitPoint, defHitPoint) {
  if (atkHitPoint === 'high' && defHitPoint === 'low') return 1.08;
  if (atkHitPoint === 'low' && defHitPoint === 'high') return 0.94;
  return 1.0;
}
// 低打点相手には高打点が有利を取れる。高打点相手には明確な対策がない（＝高打点の強み）。
export function counterHitPointOf(hitPoint) { return hitPoint === 'low' ? 'high' : null; }

export const SKILL_CATEGORIES = ['power', 'speed', 'trick', 'counter', 'mental'];
export const SKILL_CATEGORY_LABEL = {
  power: 'パワー系', speed: 'スピード系', trick: 'トリッキー系', counter: 'カウンター系', mental: 'メンタル系',
};
// 各系統に「テニプリ風のオリジナル大技」と「実在するテニスの技術に由来する技」を混在させている。
export const SKILL_POOL = {
  power: ['ライジングスマッシュ', 'パワードライブ', '剛破弾', '大地割り', 'キックサーブ', 'エッグボールドライブ'],
  speed: ['ソニックリターン', '疾風ストローク', '瞬速サーブ', 'ライトニングダッシュ', 'ライジングショット', 'スライスサーブ'],
  trick: ['幻惑ドロップ', '逆モーションショット', 'トリックスピン', 'ミラージュロブ', 'ドロップショット', 'ムーンボール'],
  counter: ['カウンターウェーブ', 'リバースアタック', 'ミラーリターン', '影踏み返し', 'ブロックリターン', 'ライジングカウンター'],
  mental: ['不動の心', '闘志覚醒', '鉄壁の精神', '背水の一振り', 'ゾーン集中', '無我の一球'],
};
export const SKILL_COST_BASE = { power: 55, speed: 45, trick: 45, counter: 50, mental: 35 };
// Lv1→Lv2→Lv3で必殺技を強化する際のコスト増分。Lv3到達で「覚醒」し、上位の派生名に変わる。
export const SKILL_LEVEL_COST_STEP = 8;
export const SKILL_MAX_LEVEL = 3;
export const SKILL_AWAKEN_BONUS = 14;
// 系統ごとの主依存ステータス
export const SKILL_STAT = { power: 'pow', speed: 'spd', trick: 'tech', counter: 'rea', mental: 'men' };
// プレースタイルが得意とする必殺技系統
export const STYLE_SKILL_AFFINITY = {
  power: 'power', speed: 'speed', technique: 'trick', counter: 'counter', allround: 'mental',
};

const NAME_POOL = [
  '黒田 蓮', '朝比奈 陸', '九条 湊', '早乙女 颯', '如月 亮', '天童 錬', '神楽坂 翼',
  '獅子堂 豪', '水無月 玲', '冬木 悠真', '桜庭 一颯', '鳳 京介', '結城 拓海', '柊 志郎',
  '雷門 剛', '風間 涼太', '日向 蒼空', '月島 律', '星野 慧', '不知火 陣', '緋村 尊',
  '白鳥 樹', '狛江 一輝', '天羽 瞬',
];
const SURNAMES = [...new Set(NAME_POOL.map((n) => n.split(' ')[0]))];
const GIVEN_NAMES = [...new Set(NAME_POOL.map((n) => n.split(' ')[1]))];

// 部員名を必要数だけ生成する。まず既存プールの未使用名を使い、足りなければ姓名を組み合わせて新規生成する。
export function generateNames(count, existingNames) {
  const used = new Set(existingNames);
  const results = [];
  const poolLeft = NAME_POOL.filter((n) => !used.has(n)).sort(() => Math.random() - 0.5);
  while (results.length < count && poolLeft.length) {
    const n = poolLeft.pop();
    results.push(n);
    used.add(n);
  }
  let guard = 0;
  while (results.length < count && guard < 3000) {
    guard += 1;
    const n = `${pick(SURNAMES)} ${pick(GIVEN_NAMES)}`;
    if (used.has(n)) continue;
    results.push(n);
    used.add(n);
  }
  return results;
}

// team/individualの rounds は「このステージを突破する（＝勝ち抜け枠に入る）のに必要な連勝数」。
// team.seedRounds は地区大会限定：前回大会で実績（district突破歴）があるチームはシード扱いで1回戦少なく済む。
export const TOURNAMENT_STAGES = [
  {
    key: 'district', label: '地区大会', power: 1.0,
    team: { participants: 6, advance: 2, rounds: 2, seedRounds: 1 },
    individual: { participants: 64, advance: 8, rounds: 3 },
  },
  {
    key: 'pref', label: '都道府県大会', power: 1.55,
    team: { participants: 32, advance: 4, rounds: 3 },
    individual: { participants: 256, advance: 16, rounds: 4 },
  },
  {
    key: 'kanto', label: '関東大会', power: 1.9,
    team: { participants: 16, advance: 4, rounds: 2 },
    individual: { participants: 64, advance: 8, rounds: 3 },
  },
  {
    key: 'national', label: '全国大会', power: 2.3,
    team: { participants: 32, advance: 0, rounds: 5 },
    individual: { participants: 256, advance: 0, rounds: 8 },
  },
];
export const SAVE_ELIGIBLE_STAGE_INDEX = 2; // 関東大会(index 2)に出場した時点で保存資格

// 上位大会への進出（advance）が決まる回戦数とは別に、そのステージの頂点（優勝）まで勝ち抜くのに
// 必要な回戦数を、参加枠数から算出する（2^n >= participants となる最小n）。
// 進出がすでに決まった後も、この回戦数までは「優勝を懸けた試合」として消化を続ける。
export function stageChampionRounds(stage, mode) {
  return Math.max(1, Math.ceil(Math.log2(stage[mode].participants)));
}

// 団体戦のポジション構成。部内戦で勝った選手をこの5枠(D1/D2は各2人)に振り分ける。
// 配列の並び順がそのまま団体戦の試合順（S3→D2→S2→D1→S1）になる。
export const POSITIONS = [
  { key: 's3', label: 'S3', type: 'singles' },
  { key: 'd2', label: 'D2', type: 'doubles' },
  { key: 's2', label: 'S2', type: 'singles' },
  { key: 'd1', label: 'D1', type: 'doubles' },
  { key: 's1', label: 'S1', type: 'singles' },
];

// 二つ名は表示名だけでなく固有パッシブ効果を持つ（企画書3.5）。
// mods の hook はバトルエンジン（battle.js）側で解決される効果種別、value は倍率の差分
// （例: +0.12 なら1.12倍、-0.2なら0.8倍）。「全国区の」称号（furthestStageReached>=3）が
// 付く場合、makeTitle 側で全モッドの value が1.5倍に増幅される。
const TITLE_DEFS = {
  power: [
    { name: '剛腕', desc: 'ストロークの威力+12%', mods: [{ hook: 'atkMult', cmd: 'stroke', value: 0.12 }] },
    { name: '破壊王', desc: '必殺技の威力+15%', mods: [{ hook: 'atkMult', cmd: 'skill', value: 0.15 }] },
    { name: '重戦車', desc: '攻撃時のスタミナ消耗-20%', mods: [{ hook: 'staminaCostMult', role: 'atk', value: -0.2 }] },
    { name: '一撃の覇者', desc: '競った局面での攻撃力+20%', mods: [{ hook: 'clutchAtkMult', value: 0.2 }] },
  ],
  speed: [
    { name: '疾風', desc: 'ネットプレーの威力+12%', mods: [{ hook: 'atkMult', cmd: 'net', value: 0.12 }] },
    { name: '稲妻', desc: '得点時のテンション上昇量+25%', mods: [{ hook: 'tensionGainMult', value: 0.25 }] },
    { name: '俊足の申し子', desc: '防御時のスタミナ消耗-25%', mods: [{ hook: 'staminaCostMult', role: 'def', value: -0.25 }] },
    { name: '瞬速の刃', desc: 'ネットプレー時の返球力+20%', mods: [{ hook: 'defMult', cmd: 'net', value: 0.2 }] },
  ],
  technique: [
    { name: '精密機械', desc: 'ディフェンス全般の返球力+10%', mods: [{ hook: 'defMult', value: 0.10 }] },
    { name: 'コートの魔術師', desc: '必殺技のコスト-20%', mods: [{ hook: 'skillCostMult', value: -0.20 }] },
    { name: '針の穴を通す一打', desc: '相性有利時の追加威力+60%', mods: [{ hook: 'compatMult', value: 0.6 }] },
    { name: '静寂の職人', desc: '被メンタルダメージ-35%', mods: [{ hook: 'mentalLossMult', value: -0.35 }] },
  ],
  counter: [
    { name: '壁', desc: 'ディフェンスコマンドの威力+15%', mods: [{ hook: 'defMult', cmd: 'defense', value: 0.15 }] },
    { name: '鉄壁の守護神', desc: '被メンタルダメージ-40%', mods: [{ hook: 'mentalLossMult', value: -0.4 }] },
    { name: 'リバウンドキング', desc: '守り切った際のテンション上昇量+30%', mods: [{ hook: 'tensionGainMult', value: 0.3 }] },
    { name: '不落の砦', desc: 'ディフェンス時のスタミナ消耗-25%', mods: [{ hook: 'staminaCostMult', role: 'def', cmd: 'defense', value: -0.25 }] },
  ],
  allround: [
    { name: '万能選手', desc: '攻守全般の威力+5%', mods: [{ hook: 'atkMult', value: 0.05 }, { hook: 'defMult', value: 0.05 }] },
    { name: 'オールマイティ', desc: '必殺技のコスト-15%', mods: [{ hook: 'skillCostMult', value: -0.15 }] },
    { name: '隙のない読み手', desc: 'ディフェンス全般の返球力+12%', mods: [{ hook: 'defMult', value: 0.12 }] },
    { name: '完成された基礎', desc: 'スタミナ・メンタル低下によるパフォーマンス低下を50%軽減', mods: [{ hook: 'conditionResist', value: 0.5 }] },
  ],
};
const TITLE_PASSIVE_BY_NAME = {};
Object.values(TITLE_DEFS).forEach((list) => list.forEach((t) => { TITLE_PASSIVE_BY_NAME[t.name] = t; }));

export const STYLE_FOCUS = {
  power: ['pow', 'sta', 'spin'],
  speed: ['spd', 'rea', 'sta'],
  technique: ['tech', 'spin', 'read'],
  counter: ['rea', 'read', 'men'],
  allround: STATS,
};

export const WEEKLY_ACTIONS = [
  { key: 'basic', label: '基礎トレ', desc: '安全に少しずつ成長。故障リスクなし。' },
  { key: 'hard', label: '高負荷トレ', desc: '大きく成長するが疲労大・故障リスクあり。' },
  { key: 'practice', label: '練習試合', desc: '他校と実戦。小さな成長とテンション経験。' },
  { key: 'rest', label: '休養', desc: 'コンディションを回復する。' },
  { key: 'event', label: 'イベント', desc: '先輩・コーチと交流。メンタル成長や技伝授のチャンス。' },
];

export const WEEKS_PER_YEAR = 20;
export const SUMMER_WEEK = 10;
export const WINTER_WEEK = 20;
export const TOTAL_YEARS = 3;
export const INITIAL_TEAM_SIZE = 7;
export const MIN_TEAM_SIZE = 7;
export const MAX_TEAM_SIZE = 30;

// 団体戦特有の負傷（第1部）。個人戦・トレーニング・スパーリングには影響せず、団体戦の代表選抜・オーダーにのみ適用される。
// 大会（団体戦シーズン）ごとに1人までしか発生せず、期間は自動抽選。次の大会に入る時点で必ず全快する。
export const TEAM_INJURY_CHANCE = 0.12;
export const TEAM_INJURY_MIN_WEEKS = 2;
export const TEAM_INJURY_MAX_WEEKS = 6;

// ============================================================
// コーチ（主人公）の成長
// 主人公はコートに立たず、指導する監督兼育成者。金銭は一切介さず、週々の指導と勝利という
// 「経験」だけでコーチとしての熟練度（Lv）が少しずつ積み上がっていく。
// 効果は3方向：①トレーニングの基礎ステ成長率 ②必殺技の習得・強化率 ③怪我リスクの低減／回復の早さ。
// ============================================================
export const COACH_EXP_BASE = 15; // Lv1→2に必要な経験値
export const COACH_EXP_STEP = 6; // 1Lvごとに必要経験値が積み増しされる量
export const COACH_LEVEL_CAP = 40;
export const COACH_EXP_PER_WEEK = 1; // 1週指導するごとの経験値
export const COACH_EXP_PER_WIN = 2; // 選手が勝利するごとの経験値
export const COACH_EXP_PART2_PER_CLEARED = 0.5; // 第2部：5番コート以内に送り込んだ人数1人あたり（挑戦終了時に一括加算）

// 経験値からコーチLvを算出する。必要経験値はLvが上がるごとにCOACH_EXP_STEPずつ増えていく
// （周回を重ねるほど熟練度が積み上がっていく、保存庫の育成と同じ手触りの長期成長カーブ）。
export function coachLevelInfo(exp) {
  let level = 1;
  let remaining = Math.max(0, exp || 0);
  let need = COACH_EXP_BASE;
  while (remaining >= need && level < COACH_LEVEL_CAP) {
    remaining -= need;
    level += 1;
    need += COACH_EXP_STEP;
  }
  return { level, into: Math.round(remaining), next: need };
}

// 指導効果（すべて経験＝コーチLvにのみ依存する。金銭は一切関与しない）
export function coachTrainingMult(level) { return 1 + level * 0.012; } // 基礎ステの成長量
export function coachSkillChanceMult(level) { return 1 + level * 0.02; } // 必殺技の習得・強化チャンス
export function coachInjuryMult(level) { return Math.max(0.55, 1 - level * 0.011); } // 怪我発生率（掛け率。低いほど安全）
export function coachRecoveryBonus(level) { return level * 0.35; } // コンディション回復量への加算

// school（schools.js の定義）を渡すと、その中学の傾向（スタイル・ステータス・性格・利き手の偏り）を
// 選手生成に反映する。opts.forcedStyle / opts.forcedPersonality は四季ヶ丘中学校等、チーム全体で
// 多様性を強制する中学のために generateTeam 側から個別指定するための上書き値。
export function createPlayer(name, grade = 1, school = null, opts = {}) {
  const style = opts.forcedStyle || (school ? weightedPick(STYLES, school.styleWeights) : pick(STYLES));
  const stats = {};
  const bias = (school && school.statBias) || {};
  STATS.forEach((s) => { stats[s] = clamp(randInt(18, 32) + (bias[s] || 0), 1, 99); });
  // 2・3年生は入部時点で経験年数分だけ底上げする。ただし1年間トレーニングを重ねて育成した
  // 2・3年生には及ばない程度の、あくまで「まだ鍛える前」の素の実力にとどめる。
  const yearsAdvanced = clamp(grade, 1, 3) - 1;
  for (let y = 0; y < yearsAdvanced; y += 1) {
    STATS.forEach((s) => { stats[s] = clamp(stats[s] + randInt(1, 4), 1, 99); });
  }
  const player = {
    id: uid(),
    name,
    grade: clamp(grade, 1, 3),
    style,
    hand: school ? weightedPick(HANDS, school.handWeights) : pick(HANDS),
    hitPoint: pick(HIT_POINTS),
    personality: opts.forcedPersonality || (school ? weightedPick(PERSONALITIES, school.personalityWeights) : pick(PERSONALITIES)),
    school: school ? school.id : null, // 出身中学（第2部以降のプロフィール表示に使う）
    isAce: false,
    aceTitle: null,
    stats,
    potential: randInt(50, 100),
    condition: randInt(80, 100),
    injured: false,
    teamInjured: false, // 団体戦にのみ出場できない負傷状態
    teamInjuryWeeksLeft: 0,
    rank: 0, // 部内序列。並び替えは state.js 側で管理
    skills: [],
    saved: false,
    title: null,
    titleId: null, // 二つ名パッシブ効果の参照キー（「全国区の」等の接頭辞を除いた素の二つ名）
    titleNational: false, // 全国区の二つ名か（パッシブ効果が1.5倍に増幅される）
    furthestStageReached: -1, // このプレイヤーがこの周で到達した最高ステージindex
    record: { wins: 0, losses: 0, championships: 0 },
    history: [],
  };
  // 少数精鋭の隠し中学は、入部の時点で既に必殺技を仕込んだ状態にする。
  const eliteLevel = (school && school.eliteSkillLevel) || 0;
  if (eliteLevel >= 1) {
    trySparkSkill(player);
    if (eliteLevel >= 2) tryLevelUpSkill(player);
  }
  return player;
}

// ============================================================
// 詳細ステータス／ダブルス適正／相性度
// ============================================================

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// 文字列シードから安定した[0,1)の疑似乱数を得る（選手ID等から毎回同じ値を再現するため）。
function pseudoRandom01(seedStr) {
  return (hashStr(seedStr) % 100000) / 100000;
}
function noise(seedStr, spread) {
  return (pseudoRandom01(seedStr) * 2 - 1) * spread;
}

export const DETAIL_STATS = ['serve', 'smash', 'volley', 'groundstroke', 'footwork', 'staminaCtrl', 'focus', 'clutch'];
export const DETAIL_STAT_LABEL = {
  serve: 'サーブ', smash: 'スマッシュ', volley: 'ボレー', groundstroke: 'グラウンドストローク',
  footwork: 'フットワーク', staminaCtrl: 'スタミナ配分', focus: '集中力', clutch: '勝負強さ',
};
// 基礎8ステータスから、テニスとしてより細かい能力値を導出する（試合エンジンには影響しない表示用の詳細値）。
export function getDetailStats(player) {
  const st = player.stats;
  const mk = (key, val) => clamp(Math.round(val + noise(`${player.id}:${key}`, 6)), 1, 99);
  return {
    serve: mk('serve', st.pow * 0.5 + st.spd * 0.2 + st.tech * 0.2),
    smash: mk('smash', st.pow * 0.6 + st.spin * 0.2 + st.tech * 0.2),
    volley: mk('volley', st.spd * 0.4 + st.tech * 0.4 + st.rea * 0.2),
    groundstroke: mk('groundstroke', st.pow * 0.3 + st.tech * 0.4 + st.spin * 0.3),
    footwork: mk('footwork', st.spd * 0.6 + st.sta * 0.2 + st.rea * 0.2),
    staminaCtrl: mk('staminaCtrl', st.sta * 0.6 + st.men * 0.2 + st.read * 0.2),
    focus: mk('focus', st.men * 0.5 + st.read * 0.3 + st.rea * 0.2),
    clutch: mk('clutch', st.men * 0.4 + st.read * 0.3 + st.pow * 0.15 + st.spd * 0.15),
  };
}

// ダブルス適正：前衛/後衛適性・ポーチ・連携力から総合ランクと推奨陣形を算出する。
export function getDoublesProfile(player) {
  const st = player.stats;
  const mk = (key, val) => clamp(Math.round(val + noise(`${player.id}:${key}`, 6)), 1, 99);
  const forward = mk('dbl_forward', st.spd * 0.35 + st.tech * 0.35 + st.rea * 0.3);
  const back = mk('dbl_back', st.pow * 0.4 + st.sta * 0.35 + st.spin * 0.25);
  const poach = mk('dbl_poach', st.rea * 0.4 + st.spd * 0.3 + st.men * 0.3);
  const synergy = mk('dbl_synergy', st.men * 0.35 + st.read * 0.35 + st.tech * 0.3);
  const overall = clamp(Math.round(Math.max(forward, back) * 0.4 + poach * 0.3 + synergy * 0.3), 1, 99);
  let formation;
  if (forward - back >= 8) formation = '前衛向き（雁行陣で活きるタイプ）';
  else if (back - forward >= 8) formation = '後衛向き（平行陣の後ろを任せたいタイプ）';
  else formation = 'オールラウンド（陣形を問わず対応可）';
  let rank;
  if (overall >= 85) rank = 'S';
  else if (overall >= 70) rank = 'A';
  else if (overall >= 55) rank = 'B';
  else if (overall >= 40) rank = 'C';
  else rank = 'D';
  return { forward, back, poach, synergy, overall, formation, rank };
}

export const PERSONALITIES = ['熱血', 'クール', 'ムードメーカー', '寡黙', '天然', '努力家', '天才肌', '負けず嫌い', 'マイペース', '紳士'];
export const PERSONALITY_TRAITS = {
  '熱血': { energy: 9, discipline: 5 },
  'クール': { energy: 2, discipline: 8 },
  'ムードメーカー': { energy: 8, discipline: 3 },
  '寡黙': { energy: 1, discipline: 7 },
  '天然': { energy: 6, discipline: 2 },
  '努力家': { energy: 5, discipline: 9 },
  '天才肌': { energy: 4, discipline: 6 },
  '負けず嫌い': { energy: 8, discipline: 6 },
  'マイペース': { energy: 3, discipline: 4 },
  '紳士': { energy: 5, discipline: 8 },
};
// 旧セーブデータ等で personality が未設定の場合も、選手IDから常に同じ性格を導出できるようにする。
export function personalityOf(player) {
  if (player.personality) return player.personality;
  return PERSONALITIES[hashStr(player.id) % PERSONALITIES.length];
}

// プレースタイルの相性（4すくみ+オールラウンド）を、対戦ではなく「組んだ時の噛み合い」として評価する。
const STYLE_WHEEL = ['power', 'technique', 'speed', 'counter'];
function styleTeammateScore(styleA, styleB) {
  if (styleA === 'allround' || styleB === 'allround') return styleA === styleB ? 6 : 5;
  if (styleA === styleB) return 8;
  const ia = STYLE_WHEEL.indexOf(styleA);
  const ib = STYLE_WHEEL.indexOf(styleB);
  const dist = Math.min(Math.abs(ia - ib), STYLE_WHEEL.length - Math.abs(ia - ib));
  return dist === 1 ? 3 : 0;
}

// 選手2人の相性度（0〜100）。性格の噛み合い・プレースタイル・ペア固有の揺らぎから算出する固定値。
export function getAffinity(playerA, playerB) {
  const persA = personalityOf(playerA);
  const persB = personalityOf(playerB);
  const ta = PERSONALITY_TRAITS[persA];
  const tb = PERSONALITY_TRAITS[persB];
  const personalityScore = 100 - (Math.abs(ta.energy - tb.energy) * 4 + Math.abs(ta.discipline - tb.discipline) * 3);
  const styleScore = styleTeammateScore(playerA.style, playerB.style) * 10;
  const pairKey = [playerA.id, playerB.id].sort().join(':');
  const score = clamp(Math.round(personalityScore * 0.55 + styleScore * 0.45 + noise(pairKey, 10)), 1, 100);
  let label, reason;
  if (score >= 88) { label = '運命のコンビ'; reason = `${persA}×${persB}、噛み合いは抜群。`; }
  else if (score >= 72) { label = '好相性'; reason = '息の合ったプレーが期待できる。'; }
  else if (score >= 55) { label = '普通'; reason = '無難に組める相性。'; }
  else if (score >= 40) { label = 'やや不安定'; reason = 'かみ合わせに工夫が要る組み合わせ。'; }
  else { label = '相性難あり'; reason = 'タイプの違いが大きく、連携には時間がかかりそう。'; }
  return { score, label, reason, personalityA: persA, personalityB: persB };
}

// 指定した選手と組む候補者たちを、相性度の高い順に並べる（ダブルスペア編成のレコメンド表示用）。
export function recommendPartners(player, candidates) {
  return candidates
    .map((c) => ({ player: c, affinity: getAffinity(player, c) }))
    .sort((a, b) => b.affinity.score - a.affinity.score);
}

// ダブルスの2人を1体の疑似コンバタントに合成する（バトルエンジンはシングルス同様に扱える）。
export function makeDoublesRef(playerA, playerB) {
  const affinity = getAffinity(playerA, playerB);
  const doublesA = getDoublesProfile(playerA);
  const doublesB = getDoublesProfile(playerB);
  const synergyBonus = Math.round((affinity.score - 50) / 10 + (doublesA.synergy + doublesB.synergy - 100) / 20);
  const stats = {};
  STATS.forEach((s) => {
    stats[s] = clamp(Math.round((playerA.stats[s] + playerB.stats[s]) / 2 + synergyBonus), 1, 99);
  });
  const mergedSkills = [...playerA.skills, ...playerB.skills]
    .sort((a, b) => b.level - a.level)
    .slice(0, 4);
  const strongerIsA = statTotal(playerA) >= statTotal(playerB);
  const titleMembers = [playerA, playerB]
    .filter((p) => p.titleId)
    .map((p) => ({ id: p.titleId, national: !!p.titleNational, display: p.title }));
  return {
    id: `${playerA.id}+${playerB.id}`,
    name: `${playerA.name}・${playerB.name}`,
    style: strongerIsA ? playerA.style : playerB.style,
    hand: strongerIsA ? playerA.hand : playerB.hand,
    hitPoint: strongerIsA ? playerA.hitPoint : playerB.hitPoint,
    stats,
    condition: Math.min(playerA.condition, playerB.condition),
    injured: playerA.injured || playerB.injured,
    skills: mergedSkills,
    isPair: true,
    memberIds: [playerA.id, playerB.id],
    memberNames: [playerA.name, playerB.name],
    titleMembers, // ダブルスは両者の二つ名パッシブを両方適用する
  };
}

// 初期メンバー7人の学年内訳（1年生3人・2年生2人・3年生2人）。人数が7と異なる場合も同じ比率で繰り返す。
function gradesForTeamSize(size) {
  const grades = [];
  for (let i = 0; i < size; i += 1) {
    const r = i % 7;
    grades.push(r < 3 ? 1 : r < 5 ? 2 : 3);
  }
  return grades;
}

// school を渡すとその中学の rosterMin を初期人数に使う（size指定時はそちらを優先）。
// forceStyleDiversity/forcePersonalityDiversity を持つ中学（四季ヶ丘等）は、5スタイル・多様な性格を
// 巡回させて必ず一通り揃うようにする。ace（氷華等）を持つ中学は、1人を「絶対王者」級に差し替える。
export function generateTeam(school = null, size = null) {
  const n = size || (school ? school.rosterMin : INITIAL_TEAM_SIZE);
  const names = generateNames(n, []);
  const grades = gradesForTeamSize(n);
  const team = names.map((name, i) => {
    const opts = {};
    if (school && school.forceStyleDiversity) opts.forcedStyle = STYLES[i % STYLES.length];
    if (school && school.forcePersonalityDiversity) opts.forcedPersonality = PERSONALITIES[i % PERSONALITIES.length];
    return createPlayer(name, grades[i], school, opts);
  });
  if (school && school.ace && school.ace.count > 0) {
    const aceTargets = [...team].sort(() => Math.random() - 0.5).slice(0, school.ace.count);
    aceTargets.forEach((p) => {
      STATS.forEach((s) => { p.stats[s] = clamp(p.stats[s] + randInt(school.ace.statBonus - 5, school.ace.statBonus + 5), 1, 99); });
      p.isAce = true;
      p.aceTitle = school.ace.title;
    });
  }
  // 初期の部内序列はステータス総合値の高い順（≒実力の目安）を出発点にする。
  team.sort((a, b) => statTotal(b) - statTotal(a)).forEach((p, i) => { p.rank = i + 1; });
  return team;
}

// 新入部員1人を生成する。reputationIndex（0=無名〜3=全国区）が高いほど能力の底上げが期待できる。
export function createRecruit(name, reputationIndex, school = null) {
  const p = createPlayer(name, 1, school);
  const bonus = clamp(reputationIndex, 0, TOURNAMENT_STAGES.length - 1) * 3;
  STATS.forEach((s) => { p.stats[s] = clamp(p.stats[s] + randInt(0, bonus), 1, 99); });
  p.potential = clamp(p.potential + reputationIndex * 4, 1, 100);
  return p;
}

// 部の知名度（＝これまでの最高到達ステージ）に沿って、翌春の新入部員を生成する。上限は中学ごとのrosterMax。
export function generateRecruits(reputationIndex, existingNames, currentSize, school = null) {
  const idx = clamp(reputationIndex, 0, TOURNAMENT_STAGES.length - 1);
  const maxSize = (school && school.rosterMax) || MAX_TEAM_SIZE;
  let count = randInt(2 + idx, 4 + idx * 2);
  count = Math.min(count, maxSize - currentSize);
  if (count <= 0) return [];
  const names = generateNames(count, existingNames);
  return names.map((n) => createRecruit(n, idx, school));
}

// 部の知名度指標。今まで部員の誰かが到達した最高ステージindexを、新入部員の質・量の基準にする。
export function reputationIndexFromTeam(team) {
  const maxReached = team.reduce((m, p) => Math.max(m, p.furthestStageReached), -1);
  return clamp(maxReached, 0, TOURNAMENT_STAGES.length - 1);
}

// 部内戦（代表選抜）で必要な対戦組数。最低保証人数（7人＝S1-3+D1-2の1オーダー分）を割り込まないよう、
// 部員が少ないうちは超過分だけを戦わせ、残りは無条件で代表入りさせる。
export function computeSquadRequiredPairs(teamLength, guaranteed = 7) {
  if (teamLength <= guaranteed) return 0;
  if (teamLength < guaranteed * 2) return teamLength - guaranteed;
  return Math.floor(teamLength / 2);
}

export function statTotal(p) { return STATS.reduce((sum, s) => sum + p.stats[s], 0); }

export function makeTitle(player) {
  const pool = TITLE_DEFS[player.style] || TITLE_DEFS.allround;
  const base = pick(pool);
  const national = player.furthestStageReached >= 3;
  return { display: national ? `全国区の${base.name}` : base.name, id: base.name, national };
}

// 全国区の二つ名はパッシブ効果のvalueを1.5倍に増幅する。
function scaleTitleMods(def, national) {
  if (!def) return [];
  const factor = national ? 1.5 : 1;
  return def.mods.map((m) => ({ ...m, value: m.value * factor }));
}

// 選手（シングルス）またはダブルスの合成ref（isPair）から、有効な二つ名パッシブmod一覧を返す。
export function getTitlePassiveMods(ref) {
  if (!ref) return [];
  if (ref.isPair) {
    return (ref.titleMembers || []).flatMap((tm) => scaleTitleMods(TITLE_PASSIVE_BY_NAME[tm.id], tm.national));
  }
  if (!ref.titleId) return [];
  return scaleTitleMods(TITLE_PASSIVE_BY_NAME[ref.titleId], ref.titleNational);
}

// UI表示用：この選手の二つ名パッシブの説明文（未保有ならnull）。
export function getTitlePassiveDesc(player) {
  if (!player || !player.titleId) return null;
  const def = TITLE_PASSIVE_BY_NAME[player.titleId];
  if (!def) return null;
  return player.titleNational ? `${def.desc}（全国区ボーナスで効果1.5倍）` : def.desc;
}

export function trySparkSkill(player, opts) {
  opts = opts || {};
  if (player.skills.length >= 4) return null;
  const category = opts.category || (Math.random() < 0.6 ? STYLE_SKILL_AFFINITY[player.style] : pick(SKILL_CATEGORIES));
  const learned = new Set(player.skills.map((s) => s.baseName || s.name));
  const candidates = SKILL_POOL[category].filter((n) => !learned.has(n));
  if (!candidates.length) return null;
  const name = pick(candidates);
  const skill = { id: uid(), category, name, baseName: name, level: 1, cost: SKILL_COST_BASE[category], awakened: false };
  player.skills.push(skill);
  return skill;
}

// 既に習得済みの必殺技を1段階強化する（Lv1→2→3）。Lv3到達時は「覚醒」し、真の派生名を得る。
export function tryLevelUpSkill(player, opts) {
  opts = opts || {};
  const pool = (player.skills || []).filter((s) => s.level < SKILL_MAX_LEVEL && (!opts.skillId || s.id === opts.skillId));
  if (!pool.length) return null;
  const skill = opts.skillId ? pool[0] : pick(pool);
  skill.baseName = skill.baseName || skill.name; // 旧セーブデータ互換
  skill.level += 1;
  skill.cost = SKILL_COST_BASE[skill.category] + (skill.level - 1) * SKILL_LEVEL_COST_STEP;
  if (skill.level >= SKILL_MAX_LEVEL && !skill.awakened) {
    skill.awakened = true;
    skill.name = `真・${skill.baseName}`;
  }
  return skill;
}

export function generateOpponent(stageIndex, teamStatTotalAvg) {
  const stage = TOURNAMENT_STAGES[stageIndex];
  const style = pick(STYLES);
  const targetTotal = teamStatTotalAvg * stage.power;
  const perStat = targetTotal / STATS.length;
  const stats = {};
  STATS.forEach((s) => { stats[s] = clamp(Math.round(rand(perStat * 0.75, perStat * 1.25)), 10, 99); });
  return {
    id: uid(),
    name: `${stage.label}の刺客`,
    style,
    hand: pick(HANDS),
    hitPoint: pick(HIT_POINTS),
    stats,
    condition: 100,
    injured: false,
    skills: Math.random() < 0.5 + stageIndex * 0.12
      ? [{ id: uid(), category: pick(SKILL_CATEGORIES), name: '未知の必殺技', level: 1, cost: 50 }]
      : [],
  };
}

// 団体戦の各ポジション用に相手を生成する（生成式自体はgenerateOpponentを流用）。
export function generateOpponentForPosition(stageIndex, teamStatTotalAvg, position) {
  const stage = TOURNAMENT_STAGES[stageIndex];
  const opponent = generateOpponent(stageIndex, teamStatTotalAvg);
  opponent.name = `${stage.label} ${position.label}の刺客`;
  if (position.type === 'doubles') opponent.isPair = true;
  return opponent;
}

// ============================================================
// 団体戦オーダー采配の「相性読み合い」
// 相手校は試合前に固定の7人ロースターと秘密のオーダー（配置）を用意する。
// プレイヤーはロースター（メンバーの実力・スタイル）だけをスカウティングでき、
// 実際にどの選手がどのポジションに来るかはオーダー確定後の対戦を通じてしか分からない。
// ============================================================
const RIVAL_SCHOOL_POOL = [
  '青嵐学園', '白鷺高校', '紅蓮学院', '蒼穹実業', '黒曜館高校', '銀盤学園', '緋色高等学校', '碧海学院', '雷鳴館', '氷刃学院',
];

export const OPPONENT_ORDER_STRATEGY_LABEL = {
  aceLast: 'エース温存型（大将戦のS1にエースを温存）',
  aceFirst: '先制猛攻型（初戦のS3にエースを投入）',
  doublesHeavy: 'ダブルス重視型（主力をダブルスに集中）',
  balanced: 'バランス型（実力を均等に分散）',
};
const OPPONENT_ORDER_STRATEGIES = Object.keys(OPPONENT_ORDER_STRATEGY_LABEL);

// 相手校の7人ロースターを生成する（生成式自体はgenerateOpponentを流用）。
// この時点ではまだポジションは決まっておらず、プレイヤーへの「スカウティング情報」として使われる。
export function generateOpponentTeamRoster(stageIndex, teamStatTotalAvg, excludeNames = []) {
  const stage = TOURNAMENT_STAGES[stageIndex];
  const names = generateNames(7, excludeNames);
  const members = names.map((name) => {
    const opp = generateOpponent(stageIndex, teamStatTotalAvg);
    opp.name = name;
    return opp;
  });
  return { schoolName: pick(RIVAL_SCHOOL_POOL), members };
}

// 相手校の秘密のオーダーを組む。戦略はランダムに選ばれ、対戦が進む・結果が出るまでプレイヤーには開示されない。
export function assignOpponentOrder(roster) {
  const byStrength = [...roster.members].sort((a, b) => statTotal(b) - statTotal(a));
  const strategy = pick(OPPONENT_ORDER_STRATEGIES);
  const ordered = strategy === 'balanced' ? [...byStrength].sort(() => Math.random() - 0.5) : byStrength;

  let singles, doublesPool;
  if (strategy === 'doublesHeavy') {
    // 上位4人をダブルスに集中させ、残り3人をシングルスに回す。
    doublesPool = ordered.slice(0, 4);
    singles = ordered.slice(4, 7);
  } else {
    singles = ordered.slice(0, 3);
    doublesPool = ordered.slice(3, 7);
  }
  // POSITIONSの実際の対戦順はS3→D2→S2→D1→S1。
  // aceFirst: 最強を初戦のS3に、aceLast/doublesHeavy/balancedは大将戦のS1にエースを置く。
  const singlesOrder = strategy === 'aceFirst'
    ? [singles[2], singles[1], singles[0]]
    : [singles[0], singles[1], singles[2]];

  const assignment = {
    s1: singlesOrder[0]?.id,
    s2: singlesOrder[1]?.id,
    s3: singlesOrder[2]?.id,
    d1: [doublesPool[0]?.id, doublesPool[1]?.id],
    d2: [doublesPool[2]?.id, doublesPool[3]?.id],
  };
  return { strategy, assignment };
}

// 相手ロースター＋秘密のオーダーから、指定ポジションの対戦相手（refオブジェクト）を組み立てる。
export function opponentRefForPosition(roster, assignment, position) {
  const byId = new Map(roster.members.map((m) => [m.id, m]));
  if (position.type === 'singles') {
    const m = byId.get(assignment[position.key]);
    return { ...m, name: `${roster.schoolName} ${position.label}：${m.name}` };
  }
  const [aId, bId] = assignment[position.key];
  const ref = makeDoublesRef(byId.get(aId), byId.get(bId));
  return { ...ref, name: `${roster.schoolName} ${position.label}：${ref.name}` };
}

// ============================================================
// 第2部：高校挑戦編（コート昇格制）
// ============================================================
export const COURT_COUNT = 20; // 20番(最下位)〜1番(最上位)
export const COURT_CLEAR_THRESHOLD = 5; // 5番コート以内
export const SQUAD_MIN = 24;
export const SQUAD_MAX = 50;
export const SQUAD_CLEAR_COUNT = 24; // 5番以内に必要な人数
export const COURT_CAPACITY = 10; // 20番コート以外の各コートの定員
export const CHALLENGE_TURN_CAP = 50; // コート変更を賭けた挑戦1本あたりの最大ターン数

// コート番号が若い（上位）ほど相手が強くなる倍率。
// 20〜3番は緩やかな右肩上がり（20番=0.585倍で有利〜3番=1.145倍で挑戦しがい有り）。
// クリアライン(5番)はまだ届く範囲に収めつつ、1・2番は「追加ステージ」的にジャンプアップして格上にする。
export function courtPowerMultiplier(targetCourt) {
  if (targetCourt === 1) return 2.2; // 頂点。真の格上との一戦
  if (targetCourt === 2) return 1.7; // 準頂点。ここから一段跳ね上がる
  return 0.55 + (COURT_COUNT - targetCourt) * 0.035;
}

// 指定コートの「番人」となる高校生を生成する。baseStatTotalは挑戦者(またはペア平均)の総合値。
export function generateCourtGuardian(targetCourt, baseStatTotal) {
  const style = pick(STYLES);
  const targetTotal = baseStatTotal * courtPowerMultiplier(targetCourt);
  const perStat = targetTotal / STATS.length;
  const stats = {};
  STATS.forEach((s) => { stats[s] = clamp(Math.round(rand(perStat * 0.8, perStat * 1.2)), 10, 99); });
  // 番人の必殺技所持率も難易度カーブに連動させる（1・2番の格上感を強める）。
  const skillChance = clamp(0.2 + (courtPowerMultiplier(targetCourt) - 0.55) * 0.5, 0.15, 0.9);
  return {
    id: uid(),
    name: `${targetCourt}番コートの番人`,
    style,
    hand: pick(HANDS),
    hitPoint: pick(HIT_POINTS),
    stats,
    condition: 100,
    injured: false,
    skills: Math.random() < skillChance
      ? [{ id: uid(), category: pick(SKILL_CATEGORIES), name: '高校生の必殺技', level: Math.random() < 0.35 ? 2 : 1, cost: 50, awakened: false }]
      : [],
  };
}

// 保存庫の選手を第2部の遠征メンバーとして複製する（コート20番スタート、元データは変更しない）。
export function makeSquadMember(vaultPlayer) {
  const clone = typeof structuredClone === 'function' ? structuredClone(vaultPlayer) : JSON.parse(JSON.stringify(vaultPlayer));
  clone.courtRank = COURT_COUNT;
  clone.part2Record = { wins: 0, losses: 0 };
  return clone;
}

// シングルス（全体の2/3〜3/4）とダブルス（残り・偶数人）に振り分ける人数を決める。
// この振り分けは第2部の開始時に一度だけ行われ、以降固定される。
export function computePart2SinglesCount(n) {
  const min = Math.ceil(n * (2 / 3));
  const max = Math.floor(n * (3 / 4));
  for (let s = max; s >= min; s -= 1) {
    if ((n - s) % 2 === 0) return s;
  }
  return n % 2 === 0 ? n - 2 : n - 1;
}

// squad（courtRank付与済みの遠征メンバー配列）を受け取り、シングルス出場者とダブルスのペアに振り分ける。
// 振り分けは総合値でシャッフル→分割し、ダブルスは隣接ペアにすることである程度実力が拮抗した組を作る。
export function computePart2Roles(squad) {
  const shuffled = [...squad].sort(() => Math.random() - 0.5);
  const singlesCount = computePart2SinglesCount(shuffled.length);
  const singles = shuffled.slice(0, singlesCount).map((p) => p.id);
  const doublesPool = shuffled.slice(singlesCount).sort((a, b) => statTotal(b) - statTotal(a));
  const doubles = [];
  for (let i = 0; i + 1 < doublesPool.length; i += 2) {
    doubles.push([doublesPool[i].id, doublesPool[i + 1].id]);
  }
  return { singles, doubles };
}

// ============================================================
// 第3部：世界戦編
// ============================================================
export const WORLD_COUNTRIES = [
  'ドイツ', 'スペイン', 'アメリカ', 'フランス', 'イタリア', 'イギリス', 'オーストラリア', 'ブラジル',
  'アルゼンチン', 'カナダ', 'ロシア', '中国', '韓国', 'インド', 'オランダ', 'スウェーデン',
  'スイス', 'ベルギー', 'ポルトガル', 'ギリシャ', 'トルコ', 'メキシコ', '南アフリカ', 'エジプト',
  'ケニア', 'ニュージーランド', 'セルビア', 'クロアチア', 'チェコ', 'ポーランド', 'オーストリア', 'デンマーク',
]; // 全32か国
export const WORLD_FINAL_COUNTRY = 'ドイツ';
export const WORLD_SEMI_CANDIDATES = ['スペイン', 'アメリカ'];
const WORLD_RESERVED = new Set([WORLD_FINAL_COUNTRY, ...WORLD_SEMI_CANDIDATES]);
// 決勝・準決勝の固定3か国を除いた、1次リーグ〜準々決勝でランダム抽選される国のプール。
export const WORLD_RANDOM_POOL = WORLD_COUNTRIES.filter((c) => !WORLD_RESERVED.has(c));

export const WORLD_STAGE_LABEL = {
  league1: '1次リーグ', league2: '2次リーグ', quarter: '準々決勝', semi: '準決勝', final: '決勝',
};
// 難易度カーブ：1番コート(courtPowerMultiplier=2.2)を上回るよう、決勝・準決勝を格上に設定する。
// 1次リーグ≒2番コート格、2次リーグ≒1〜2番コートの中間、準々決勝でさらに一段、準決勝・決勝で1番コートを明確に超える。
export const WORLD_STAGE_MULT = {
  league1: 1.7, league2: 2.0, quarter: 2.25, semi: 2.6, final: 3.0,
};
export const WORLD_LEAGUE_ROUNDS = 3;
export const WORLD_ROSTER_SIZE = 8;

// S1〜S4（シングルス4）＋D1・D2（ダブルス2組=4人）で計8人。並び順がそのまま対戦順になる。
export const WORLD_POSITIONS = [
  { key: 's1', label: 'S1', type: 'singles' },
  { key: 'd1', label: 'D1', type: 'doubles' },
  { key: 's2', label: 'S2', type: 'singles' },
  { key: 'd2', label: 'D2', type: 'doubles' },
  { key: 's3', label: 'S3', type: 'singles' },
  { key: 's4', label: 'S4', type: 'singles' },
];

export const INJURY_CHANCE = 0.1; // 出場した選手が対戦前に負傷する確率
export const INJURY_WITHDRAW_CHANCE = 0.3; // 負傷した場合のうち、そのまま大会離脱になる割合（残りは軽傷で出場続行）

// 'none' | 'minor'（軽傷。ペナルティ付きで出場は続けられる） | 'withdraw'（そのまま大会離脱）
export function rollPart3Injury() {
  if (Math.random() >= INJURY_CHANCE) return 'none';
  return Math.random() < INJURY_WITHDRAW_CHANCE ? 'withdraw' : 'minor';
}

// 予約済み（準決勝・決勝）を除いたプールからcount件、重複なしでランダムに国を選ぶ。
export function pickRandomCountries(count, excludeNames) {
  const excl = new Set(excludeNames || []);
  const pool = WORLD_RANDOM_POOL.filter((c) => !excl.has(c));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  if (shuffled.length >= count) return shuffled.slice(0, count);
  const result = [...shuffled];
  while (result.length < count) result.push(pick(WORLD_RANDOM_POOL));
  return result;
}

export function generateWorldOpponent(countryName, multiplier, baseStatTotal, positionLabel) {
  const style = pick(STYLES);
  const targetTotal = baseStatTotal * multiplier;
  const perStat = targetTotal / STATS.length;
  const stats = {};
  STATS.forEach((s) => { stats[s] = clamp(Math.round(rand(perStat * 0.85, perStat * 1.15)), 10, 99); });
  const skillChance = clamp(0.3 + multiplier * 0.15, 0.2, 0.95);
  return {
    id: uid(),
    name: `${countryName}代表（${positionLabel}）`,
    style,
    hand: pick(HANDS),
    hitPoint: pick(HIT_POINTS),
    stats,
    condition: 100,
    injured: false,
    skills: Math.random() < skillChance
      ? [{ id: uid(), category: pick(SKILL_CATEGORIES), name: `${countryName}代表の必殺技`, level: Math.random() < 0.5 ? 2 : 1, cost: 50, awakened: Math.random() < 0.25 }]
      : [],
  };
}

// 第2部の遠征メンバーのうち5番コート以内に到達した選手を、第3部の世界代表候補として複製する。
export function makePart3SquadMember(part2Player) {
  const clone = typeof structuredClone === 'function' ? structuredClone(part2Player) : JSON.parse(JSON.stringify(part2Player));
  clone.part3Withdrawn = false;
  clone.part3Record = { wins: 0, losses: 0 };
  return clone;
}
