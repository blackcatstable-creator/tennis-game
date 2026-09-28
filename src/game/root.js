// ============================================================
// root.js — 中学をまたいだトップレベルのセーブ管理（スロット式）
// 「保存庫（vault）」は全中学で共有し、各中学の育成進行（team/year/week/coach/part2/part3等）は
// 中学ごとに独立したスロットとして保持する。これにより、途中セーブで別の中学へいつでも切り替えられる。
// ============================================================
import { newGame, canEnterPart2, canEnterPart3 } from './state.js';
import { coachLevelInfo } from './data.js';
import { schoolById } from './schools.js';

const ROOT_SAVE_KEY = 'trc_root_v1';
const LEGACY_SAVE_KEY = 'trc_save_v1';

function loadRoot() {
  try {
    const raw = localStorage.getItem(ROOT_SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function saveRoot(root) {
  try { localStorage.setItem(ROOT_SAVE_KEY, JSON.stringify(root)); } catch (e) { /* storage full/unavailable: ignore */ }
}

function loadLegacySave() {
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearLegacySave() {
  try { localStorage.removeItem(LEGACY_SAVE_KEY); } catch (e) { /* ignore */ }
}

export function newRoot() {
  return {
    version: 1,
    vault: [],
    meta: { bestCoachLevel: 0, part3ChampionEver: false },
    activeSchoolId: null,
    slots: {},
  };
}

// 旧・単一セーブ（中学選択機能追加前）を検出したら、陽泉中学校のスロットとして1回だけ移行する。
function migrateLegacySave(legacy) {
  const legacySchoolId = 'yosen';
  const vault = (legacy.vault || []).map((p) => ({ ...p, school: p.school || legacySchoolId }));
  const team = (legacy.team || []).map((p) => ({ ...p, school: p.school || legacySchoolId }));
  const slot = { ...legacy, team, schoolId: legacySchoolId };
  delete slot.vault;
  const coachLevel = coachLevelInfo(legacy.coach ? legacy.coach.exp : 0).level;
  const root = {
    version: 1,
    vault,
    meta: {
      bestCoachLevel: coachLevel,
      part3ChampionEver: !!(legacy.part3 && legacy.part3.outcome === 'champion'),
    },
    activeSchoolId: legacySchoolId,
    slots: { [legacySchoolId]: slot },
  };
  saveRoot(root);
  clearLegacySave();
  return root;
}

export function initialRootState() {
  const loaded = loadRoot();
  if (loaded) {
    if (!loaded.meta) loaded.meta = { bestCoachLevel: 0, part3ChampionEver: false };
    if (!loaded.slots) loaded.slots = {};
    if (!loaded.vault) loaded.vault = [];
    return loaded;
  }
  const legacy = loadLegacySave();
  if (legacy) return migrateLegacySave(legacy);
  return newRoot();
}

// state.js側の各関数は今まで通り「vault込みの単一state」を受け取れるよう、
// アクティブスロット＋共有vaultを合成したフラットな状態を組み立てる。
export function getActiveFlatState(root) {
  if (!root.activeSchoolId) return null;
  const slot = root.slots[root.activeSchoolId];
  if (!slot) return null;
  return { ...slot, vault: root.vault };
}

// state.js側の関数が返したフラットな状態を、共有vaultとスロットへ分離して書き戻す。
// あわせて、隠し中学の解禁条件判定に使うmeta（歴代コーチLv・世界一達成）を更新する。
export function commitFlatState(root, flatState) {
  const { vault, ...slot } = flatState;
  const schoolId = slot.schoolId;
  const meta = { ...root.meta };
  meta.bestCoachLevel = Math.max(meta.bestCoachLevel || 0, coachLevelInfo(slot.coach ? slot.coach.exp : 0).level);
  if (slot.part3 && slot.part3.outcome === 'champion') meta.part3ChampionEver = true;
  return { ...root, vault, meta, slots: { ...root.slots, [schoolId]: slot } };
}

export function startSchoolSlot(root, schoolId) {
  const school = schoolById(schoolId);
  const slot = newGame(school);
  return { ...root, activeSchoolId: schoolId, slots: { ...root.slots, [schoolId]: slot } };
}

export function switchToSchool(root, schoolId) {
  if (!root.slots[schoolId]) return root;
  return { ...root, activeSchoolId: schoolId };
}

export function backToSchoolSelect(root) {
  return { ...root, activeSchoolId: null };
}

// 現在プレイ中の中学のスロットだけを初期化する（保存庫や他中学の進行は保持する）。
export function resetActiveSlot(root) {
  if (!root.activeSchoolId) return root;
  const school = schoolById(root.activeSchoolId);
  return { ...root, slots: { ...root.slots, [root.activeSchoolId]: newGame(school) } };
}

// 隠し中学の解禁判定に使うmetaをまとめる（vaultCountは常にvault.lengthから最新値を取る）。
export function unlockMetaOf(root) {
  return {
    vaultCount: root.vault.length,
    bestCoachLevel: root.meta.bestCoachLevel || 0,
    part3ChampionEver: !!root.meta.part3ChampionEver,
  };
}

// SchoolSelectScreen表示用：そのスロットが未着手か、どこまで進んでいるかの簡易サマリ。
export function slotStatus(root, schoolId) {
  const slot = root.slots[schoolId];
  if (!slot) return { started: false, label: '未プレイ' };
  if (slot.team && slot.team.length === 0) return { started: true, label: `卒部済み（世代${slot.genNumber}）` };
  return { started: true, label: `${slot.year}年目 第${slot.week}週（世代${slot.genNumber}）` };
}

// タイトル画面：保存庫の人数だけで判定できる（第2部はどのスロットが担うかに関わらず条件は共通）。
export function canAnyEnterPart2(root) {
  return canEnterPart2({ vault: root.vault }) && Object.keys(root.slots).length > 0;
}

// タイトル画面：いずれかの中学スロットが第2部をクリア済みなら第3部に挑戦できる。
export function canAnyEnterPart3(root) {
  return Object.values(root.slots).some((slot) => canEnterPart3(slot));
}

// 第2部／第3部の「どの中学の遠征として挑むか」選択画面用に、各スロットの状態をまとめる。
export function schoolSlotsSummary(root) {
  return Object.keys(root.slots).map((schoolId) => {
    const slot = root.slots[schoolId];
    return {
      schoolId,
      school: schoolById(schoolId),
      status: slotStatus(root, schoolId),
      canPart2: canEnterPart2({ vault: root.vault }),
      canPart3: canEnterPart3(slot),
      hasPart2Progress: !!slot.part2,
      hasPart3Progress: !!slot.part3,
    };
  });
}
