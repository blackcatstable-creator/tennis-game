import { COURT_CLEAR_THRESHOLD, SQUAD_CLEAR_COUNT, SQUAD_MIN, SQUAD_MAX } from '../game/data.js';
import { schoolById } from '../game/schools.js';

export default function Part2HomeScreen({ state, onEnter, onSwitchSlot, onBackToTitle }) {
  const school = schoolById(state.schoolId);
  const part2 = state.part2;
  const clearedCount = part2 ? part2.squad.filter((m) => m.courtRank <= COURT_CLEAR_THRESHOLD).length : 0;

  return (
    <div className="home-screen">
      <div className="home-hero home-hero-part2">
        <div className="home-hero-part">第2部：高校挑戦編</div>
        <h2 className="home-hero-title">遠征チーム（指揮：{school.name}出身コーチ）</h2>
        <div className="home-hero-sub">保存庫（全中学で共有）から{SQUAD_MIN}〜{SQUAD_MAX}人を選抜し、20番コートから駆け上がる。</div>
      </div>

      {part2 ? (
        <div className="home-stat-row">
          <div className="home-stat"><div className="home-stat-label">遠征メンバー</div><div className="home-stat-value">{part2.squad.length}人</div></div>
          <div className="home-stat"><div className="home-stat-label">{COURT_CLEAR_THRESHOLD}番以内</div><div className="home-stat-value">{clearedCount}<span className="home-stat-unit">/{SQUAD_CLEAR_COUNT}人</span></div></div>
          <div className="home-stat"><div className="home-stat-label">結果</div><div className="home-stat-value">{part2.simResult ? (part2.cleared ? 'クリア' : '挑戦終了') : '挑戦中'}</div></div>
        </div>
      ) : (
        <div className="home-empty">このセーブではまだ第2部に挑戦していません。保存庫から遠征メンバーを選抜するところから始まります。</div>
      )}

      <div className="home-actions">
        <button className="primary large" onClick={onEnter}>
          {part2 ? '第2部を再開する' : '遠征メンバーを選抜する'}
        </button>
        <button onClick={onSwitchSlot}>指揮するコーチ（セーブ）を切り替える</button>
        <button onClick={onBackToTitle}>タイトルに戻る</button>
      </div>
    </div>
  );
}
