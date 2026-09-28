import { coachLevelInfo, TOURNAMENT_STAGES } from '../game/data.js';
import { schoolById } from '../game/schools.js';

export default function Part1HomeScreen({ state, onEnter, onSwitchSchool, onBackToTitle }) {
  const school = schoolById(state.schoolId);
  const coach = coachLevelInfo(state.coach ? state.coach.exp : 0);
  const graduated = state.team.length === 0;
  const championships = state.teamChampionships || {};
  const totalChampionships = Object.values(championships).reduce((sum, n) => sum + n, 0);

  return (
    <div className="home-screen">
      <div className="home-hero">
        <div className="home-hero-part">第1部：中学・部活編</div>
        <h2 className="home-hero-title">{school.name}</h2>
        <div className="home-hero-sub">{school.archetype} ／ {school.tagline}</div>
      </div>

      <div className="home-stat-row">
        <div className="home-stat"><div className="home-stat-label">進行</div><div className="home-stat-value">{graduated ? `卒部済み（世代${state.genNumber}）` : `${state.year}年目 第${state.week}週`}</div></div>
        <div className="home-stat"><div className="home-stat-label">部員数</div><div className="home-stat-value">{state.team.length}人</div></div>
        <div className="home-stat"><div className="home-stat-label">コーチLv</div><div className="home-stat-value">{coach.level}<span className="home-stat-unit">（{coach.into}/{coach.next}）</span></div></div>
        <div className="home-stat"><div className="home-stat-label">保存庫</div><div className="home-stat-value">{state.vault.length}人</div></div>
        <div className="home-stat"><div className="home-stat-label">通算優勝</div><div className="home-stat-value">{totalChampionships}回</div></div>
      </div>
      {totalChampionships > 0 && (
        <div className="sub" style={{ marginTop: -6, marginBottom: 10 }}>
          内訳：{TOURNAMENT_STAGES.filter((st) => championships[st.key]).map((st) => `${st.label}優勝${championships[st.key]}回`).join('／')}
        </div>
      )}

      <div className="home-actions">
        <button className="primary large" onClick={onEnter}>
          {graduated ? '卒部処理を確認する' : '部活へ向かう'}
        </button>
        <button onClick={onSwitchSchool}>他の中学に切り替える</button>
        <button onClick={onBackToTitle}>タイトルに戻る</button>
      </div>
    </div>
  );
}
