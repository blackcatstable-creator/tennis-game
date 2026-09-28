import { Fragment } from 'react';
import { STYLE_LABEL, HAND_LABEL, HIT_POINT_LABEL, SAVE_ELIGIBLE_STAGE_INDEX, SKILL_CATEGORY_LABEL, statTotal } from '../game/data.js';
import StatGrid from './StatGrid.jsx';

export default function RosterTable({ team, onOpenStatus }) {
  return (
    <table className="roster-table">
      <thead>
        <tr><th>学年</th><th>名前</th><th>序列</th><th>スタイル</th><th>総合値</th><th>コンディション</th><th>状態</th><th>技</th><th>戦績</th><th></th></tr>
      </thead>
      <tbody>
        {[...team].sort((a, b) => a.rank - b.rank).map((p) => (
          <Fragment key={p.id}>
            <tr className={`roster-main${p.injured ? ' injured' : ''}`}>
              <td className="rc-grade" data-label="学年">{p.grade}年</td>
              <td className="rc-name">{p.name}{p.isAce ? <span className="tag" style={{ background: '#7a5a13', color: '#ffe6a3', marginLeft: 4 }}>{p.aceTitle}</span> : null}</td>
              <td className="rc-rank" data-label="序列">{p.rank}</td>
              <td className="rc-style" data-label="スタイル">
                {STYLE_LABEL[p.style]}
                {p.hand && p.hitPoint && (
                  <div style={{ fontSize: 10, color: '#9fd8b6' }}>{HAND_LABEL[p.hand]}・{HIT_POINT_LABEL[p.hitPoint]}</div>
                )}
              </td>
              <td className="rc-total" data-label="総合値">{statTotal(p)}</td>
              <td className="rc-cond" data-label="コンディション">{Math.round(p.condition)}</td>
              <td className="rc-state" data-label="状態">
                {p.injured ? '怪我療養中' : p.teamInjured ? `団体戦負傷中（あと${p.teamInjuryWeeksLeft}週）` : '良好'}
                {' '}{p.furthestStageReached >= SAVE_ELIGIBLE_STAGE_INDEX ? <span className="tag saved">保存資格</span> : null}
              </td>
              <td className="rc-skills" data-label="技">{p.skills.length}/4</td>
              <td className="rc-record" data-label="戦績">{p.record.wins}勝{p.record.losses}敗</td>
              <td className="rc-action"><button onClick={() => onOpenStatus(p.id)}>詳細を見る</button></td>
            </tr>
            <tr className="roster-sub">
              <td colSpan="10" style={{ borderBottom: '1px solid #1a3d28', paddingTop: 0 }}>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#9fd8b6', fontSize: 12 }}>簡易ステータス</summary>
                  <StatGrid stats={p.stats} />
                  {p.skills.length > 0 && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      習得技: {p.skills.map((s) => `${s.awakened ? '★' : ''}${s.name}(${SKILL_CATEGORY_LABEL[s.category]}/Lv${s.level}/消費${s.cost})`).join('、')}
                    </div>
                  )}
                </details>
              </td>
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
