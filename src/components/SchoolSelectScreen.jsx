import { SCHOOLS, isSchoolUnlocked } from '../game/schools.js';
import { unlockMetaOf, slotStatus } from '../game/root.js';
import SchoolArt from './SchoolArt.jsx';

export default function SchoolSelectScreen({ root, onSelect }) {
  const meta = unlockMetaOf(root);
  const visible = [...SCHOOLS].sort((a, b) => Number(a.hidden) - Number(b.hidden));

  return (
    <div className="card">
      <h2>中学を選択</h2>
      <div className="sub" style={{ marginBottom: 12 }}>
        オマージュ元の個性を持つ中学から1校を選んで入部する。セーブは中学ごとに独立しており、育成の途中でいつでも他の中学に切り替えられる。
        保存庫（歴代選手 {root.vault.length}人）は全中学で共有され、第2部以降は出身中学の異なる選手で混成チームを編成できる。
      </div>
      <div className="school-grid">
        {visible.map((school) => {
          const unlocked = isSchoolUnlocked(school, meta);
          const status = slotStatus(root, school.id);
          const buttonLabel = !unlocked ? '条件未達成' : status.started ? 'つづきから' : 'この中学で入部する';
          return (
            <div key={school.id} className={`school-card ${unlocked ? '' : 'locked'} ${school.hidden ? 'hidden-school' : ''}`}>
              <div className="school-art-wrap">
                <SchoolArt schoolId={school.id} />
              </div>
              <div className="school-name">{school.hidden ? '🔒 ' : ''}{school.name}</div>
              <div className="school-archetype">{school.archetype}</div>
              <div className="school-tagline">{school.tagline}</div>
              <div className="school-meta">
                部員規模：{school.rosterMin}〜{school.rosterMax}人
              </div>
              <div className="school-meta">コーチ方針：{school.coachTrait.label}（{school.coachTrait.desc}）</div>
              {!unlocked && school.unlock ? (
                <div className="school-lock">解禁条件：{school.unlock.describe(meta)}</div>
              ) : status.started ? (
                <div className="school-status">進行状況：{status.label}</div>
              ) : null}
              <button className="primary" disabled={!unlocked} onClick={() => onSelect(school.id)}>{buttonLabel}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
