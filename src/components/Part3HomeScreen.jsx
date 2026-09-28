import { WORLD_STAGE_LABEL } from '../game/data.js';
import { schoolById } from '../game/schools.js';

export default function Part3HomeScreen({ state, onEnter, onSwitchSlot, onBackToTitle }) {
  const school = schoolById(state.schoolId);
  const part3 = state.part3;
  const stageLabel = part3 ? (WORLD_STAGE_LABEL[part3.stage] || part3.stage) : null;

  return (
    <div className="home-screen">
      <div className="home-hero home-hero-part3">
        <div className="home-hero-part">第3部：世界戦編</div>
        <h2 className="home-hero-title">{school.name} の世界代表チーム</h2>
        <div className="home-hero-sub">1次・2次リーグ（重複不可の3回戦）を勝ち抜き、決勝トーナメントで世界一を目指す。</div>
      </div>

      {part3 ? (
        <div className="home-stat-row">
          <div className="home-stat"><div className="home-stat-label">世界代表</div><div className="home-stat-value">{part3.squad.length}人</div></div>
          <div className="home-stat"><div className="home-stat-label">現在の段階</div><div className="home-stat-value">{part3.outcome ? (part3.outcome === 'champion' ? '世界一' : '敗退') : stageLabel}</div></div>
        </div>
      ) : (
        <div className="home-empty">第2部で5番コート以内に到達したメンバーで、世界代表チームを新しく編成します。</div>
      )}

      <div className="home-actions">
        <button className="primary large" onClick={onEnter}>
          {part3 ? '第3部を再開する' : '世界戦に出発する'}
        </button>
        <button onClick={onSwitchSlot}>担当する中学を変更する</button>
        <button onClick={onBackToTitle}>タイトルに戻る</button>
      </div>
    </div>
  );
}
