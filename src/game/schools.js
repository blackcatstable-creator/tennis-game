// ============================================================
// schools.js — 中学マスタデータ（第1部：中学選択）
// テニプリ風の10校をオリジナル名でオマージュ。各校は「入ってくる選手の傾向」と
// 「コーチのスキル（指導方針による補正）」で個性を表現する。
// 明らかに強い2校は隠し中学とし、実績ベースの条件を満たすまで選択できない。
// ============================================================

// coachTrait の共通シェイプ：state.js側の各種成長・怪我判定にそのまま掛け合わされる係数。
// trainingMult: 基礎/高負荷トレの成長量倍率　injuryMult: 高負荷・団体戦の負傷率倍率
// skillChanceMult: 必殺技の閃き・強化チャンス倍率　recoveryBonus: 休養・療養回復量への加算
function trait(label, desc, overrides) {
  return { label, desc, trainingMult: 1, injuryMult: 1, skillChanceMult: 1, recoveryBonus: 0, ...overrides };
}

export const SCHOOLS = [
  {
    id: 'yosen', name: '陽泉中学校', kana: 'ようせん', hidden: false,
    archetype: 'バランス型',
    tagline: '基礎を大切にする、まっすぐな部活動。誰にでも門戸が開かれた王道の中学。',
    rosterMin: 7, rosterMax: 30,
    styleWeights: null, // 均等
    statBias: {},
    personalityWeights: null, // 均等
    handWeights: null,
    ace: null,
    eliteSkillLevel: 0,
    coachTrait: trait('基礎重視の指導', '基礎トレ・高負荷トレの成長量+8%', { trainingMult: 1.08 }),
    unlock: null,
  },
  {
    id: 'hyoka', name: '氷華学園中等部', kana: 'ひょうかがくえん', hidden: false,
    archetype: '大所帯・絶対王者',
    tagline: '部員数は県下随一。頂点に君臨する「絶対王者」を筆頭に、圧倒的な物量で相手を飲み込む。',
    rosterMin: 12, rosterMax: 34,
    styleWeights: { power: 1.3, speed: 0.9, technique: 1.3, counter: 0.8, allround: 1.0 },
    statBias: { pow: 2, tech: 2, sta: -2 },
    personalityWeights: null,
    handWeights: null,
    ace: { count: 1, statBonus: 20, title: '絶対王者' },
    eliteSkillLevel: 0,
    coachTrait: trait('王者の帝王学', '高負荷トレの成長量+18%／怪我発生率+15%（スパルタ指導）', { trainingMult: 1.18, injuryMult: 1.15 }),
    unlock: null,
  },
  {
    id: 'shikigaoka', name: '四季ヶ丘中学校', kana: 'しきがおか', hidden: false,
    archetype: '個性豊か',
    tagline: '一人ひとりがまったく違うスタイルを持つ、統率よりも個性を重んじる自由な部活動。',
    rosterMin: 9, rosterMax: 30,
    styleWeights: null,
    statBias: {},
    personalityWeights: null,
    handWeights: null,
    ace: null,
    eliteSkillLevel: 0,
    forceStyleDiversity: true, // 生成時に5スタイルを巡回させ必ず揃える
    forcePersonalityDiversity: true,
    coachTrait: trait('個性を伸ばす自由な指導', '必殺技の閃き・強化率+20%／基礎成長-5%', { skillChanceMult: 1.2, trainingMult: 0.95 }),
    unlock: null,
  },
  {
    id: 'shiranui', name: '不知火中学校', kana: 'しらぬい', hidden: false,
    archetype: '闘志・粘り',
    tagline: '荒削りでも喰らいついていく闘争心。逆境ほど燃える負けん気の集団。',
    rosterMin: 7, rosterMax: 26,
    styleWeights: { power: 0.9, speed: 1.0, technique: 0.8, counter: 1.3, allround: 1.1 },
    statBias: { men: 3, rea: 2, spin: -2 },
    personalityWeights: { '熱血': 3, '負けず嫌い': 3, 'クール': 0.5, 'ムードメーカー': 1, '寡黙': 0.5, '天然': 0.5, '努力家': 1.5, '天才肌': 0.5, 'マイペース': 0.5, '紳士': 0.5 },
    handWeights: null,
    ace: null,
    eliteSkillLevel: 0,
    coachTrait: trait('気迫の指導', '団体戦の負傷発生率-10%', { injuryMult: 0.9 }),
    unlock: null,
  },
  {
    id: 'yamabiko', name: '山彦中学校', kana: 'やまびこ', hidden: false,
    archetype: 'データ・叩き上げ',
    tagline: '才能よりも積み重ね。地道な分析とトレーニングで格上を喰う下剋上の中学。',
    rosterMin: 7, rosterMax: 26,
    styleWeights: { power: 0.8, speed: 0.9, technique: 1.4, counter: 1.0, allround: 1.0 },
    statBias: { pow: -2, spd: -1, tech: 1 },
    personalityWeights: { '努力家': 3, '寡黙': 1.5, 'クール': 1.2, '熱血': 1, 'ムードメーカー': 0.6, '天然': 0.6, '天才肌': 0.3, '負けず嫌い': 1, 'マイペース': 0.8, '紳士': 1 },
    handWeights: null,
    ace: null,
    eliteSkillLevel: 0,
    coachTrait: trait('データ分析指導', '基礎トレの成長量+15%／高負荷トレの怪我発生率-10%', { trainingMult: 1.15, injuryMult: 0.9 }),
    unlock: null,
  },
  {
    id: 'ryukai', name: '琉海中学校', kana: 'りゅうかい', hidden: false,
    archetype: '自由奔放',
    tagline: '型にはまらないプレースタイル。のびのびとした空気の中から独創的な選手が育つ。',
    rosterMin: 7, rosterMax: 26,
    styleWeights: { power: 0.8, speed: 1.3, technique: 1.2, counter: 0.7, allround: 1.0 },
    statBias: { spd: 2, spin: 2, men: -2 },
    personalityWeights: { '天然': 3, 'マイペース': 3, 'ムードメーカー': 1.5, '熱血': 0.8, 'クール': 0.6, '寡黙': 0.6, '努力家': 0.6, '天才肌': 1.2, '負けず嫌い': 0.6, '紳士': 0.6 },
    handWeights: { right: 1.0, left: 1.6 },
    ace: null,
    eliteSkillLevel: 0,
    coachTrait: trait('型破りな指導', '必殺技の閃き率+15%／高負荷トレの怪我発生率-15%', { skillChanceMult: 1.15, injuryMult: 0.85 }),
    unlock: null,
  },
  {
    id: 'rokko', name: '六甲中学校', kana: 'ろっこう', hidden: false,
    archetype: '守備型・のんびり',
    tagline: '拾って、拾って、拾い続ける。慌てず騒がず、粘り強い守備で相手を消耗させる。',
    rosterMin: 7, rosterMax: 26,
    styleWeights: { power: 0.6, speed: 0.9, technique: 0.9, counter: 1.6, allround: 1.0 },
    statBias: { sta: 3, rea: 2, pow: -3 },
    personalityWeights: { 'マイペース': 3, '天然': 1.5, '紳士': 1.5, 'クール': 1, '熱血': 0.5, 'ムードメーカー': 1, '寡黙': 1, '努力家': 1, '天才肌': 0.5, '負けず嫌い': 0.5 },
    handWeights: null,
    ace: null,
    eliteSkillLevel: 0,
    coachTrait: trait('粘りの指導', '休養時の回復量+20％相当／高負荷トレの怪我発生率-20%', { recoveryBonus: 5, injuryMult: 0.8 }),
    unlock: null,
  },
  {
    id: 'seiran', name: '聖蘭中学校', kana: 'せいらん', hidden: false,
    archetype: '理論派',
    tagline: '感覚よりも理論。緻密なコース取りと読み合いで格上を打ち崩す頭脳派集団。',
    rosterMin: 7, rosterMax: 26,
    styleWeights: { power: 0.6, speed: 0.9, technique: 1.4, counter: 1.1, allround: 1.0 },
    statBias: { tech: 3, read: 2, pow: -3 },
    personalityWeights: { '紳士': 2.5, 'クール': 2.5, '寡黙': 1.5, '努力家': 1.2, '熱血': 0.4, 'ムードメーカー': 0.6, '天然': 0.4, '天才肌': 1, '負けず嫌い': 0.6, 'マイペース': 0.6 },
    handWeights: null,
    ace: null,
    eliteSkillLevel: 0,
    coachTrait: trait('理論派の指導', '必殺技のレベルアップ率+20%／基礎成長-5%', { skillChanceMult: 1.2, trainingMult: 0.95 }),
    unlock: null,
  },
  // ------------------------------------------------------------
  // 隠し中学：明らかに格上の2校。実績ベースの条件を満たすまで選択不可。
  // ------------------------------------------------------------
  {
    id: 'tenpa', name: '天覇中学校', kana: 'てんぱ', hidden: true,
    archetype: '少数精鋭',
    tagline: '部員はごくわずか。だがその一人ひとりが、既に完成された精鋭ばかり。',
    rosterMin: 7, rosterMax: 9,
    styleWeights: { power: 1.0, speed: 1.0, technique: 1.3, counter: 1.0, allround: 1.3 },
    statBias: { pow: 12, spd: 12, sta: 12, tech: 12, rea: 12, spin: 12, men: 12, read: 12 },
    personalityWeights: { '天才肌': 3, '負けず嫌い': 2, 'クール': 1.5, '寡黙': 1, '熱血': 0.8, 'ムードメーカー': 0.5, '天然': 0.3, '努力家': 1, 'マイペース': 0.5, '紳士': 1 },
    handWeights: null,
    ace: null,
    eliteSkillLevel: 1, // 全員が入部時点で必殺技Lv1を1つ習得済み
    coachTrait: trait('妥協なき精鋭主義', '基礎/高負荷トレの成長量+25%・必殺技率+15%／怪我発生率+10%', { trainingMult: 1.25, skillChanceMult: 1.15, injuryMult: 1.1 }),
    unlock: {
      describe: (meta) => `保存庫に歴代15人以上の選手を保存する（現在 ${meta.vaultCount}/15人）`,
      check: (meta) => meta.vaultCount >= 15,
    },
  },
  {
    id: 'kannazuki', name: '神無月中学校', kana: 'かんなづき', hidden: true,
    archetype: '伝説の無敗校',
    tagline: '公式戦で一度も負けたことがないと語り継がれる、伝説そのものの中学。',
    rosterMin: 10, rosterMax: 30,
    styleWeights: null,
    statBias: { pow: 14, spd: 14, sta: 14, tech: 14, rea: 14, spin: 14, men: 14, read: 14 },
    personalityWeights: null,
    handWeights: null,
    ace: null,
    eliteSkillLevel: 2, // 全員が入部時点で必殺技Lv2まで習得済み
    coachTrait: trait('無敗の伝統', '成長量+20%・必殺技率+25%・怪我発生率-40%・休養回復+25%相当', {
      trainingMult: 1.2, skillChanceMult: 1.25, injuryMult: 0.6, recoveryBonus: 6,
    }),
    unlock: {
      describe: (meta) => `いずれかの中学で世界一になる（${meta.part3ChampionEver ? '達成済み' : '未達成'}）`,
      check: (meta) => meta.part3ChampionEver,
    },
  },
];

export const SCHOOL_LABEL = Object.fromEntries(SCHOOLS.map((s) => [s.id, s.name]));

export function schoolById(id) {
  return SCHOOLS.find((s) => s.id === id) || SCHOOLS[0];
}

export function isSchoolUnlocked(school, meta) {
  if (!school.unlock) return true;
  return school.unlock.check(meta);
}
