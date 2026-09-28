import { schoolSlotsSummary } from '../game/root.js';

const PART_LABEL = { part2: '第2部：高校挑戦編', part3: '第3部：世界戦編' };

export default function PartSlotPickerScreen({ root, part, onSelect, onBack }) {
  const slots = schoolSlotsSummary(root);
  const eligibleKey = part === 'part3' ? 'canPart3' : 'canPart2';
  const progressKey = part === 'part3' ? 'hasPart3Progress' : 'hasPart2Progress';

  return (
    <div className="card">
      <h2>{PART_LABEL[part]} — {part === 'part2' ? 'どのコーチ（セーブ）が遠征を率いますか' : 'どのセーブの代表チームで挑みますか'}</h2>
      <div className="sub" style={{ marginBottom: 12 }}>
        {part === 'part2'
          ? '遠征メンバーは保存庫（全中学で共有）から自由に選抜できます。ここではその遠征を率いるコーチ（＝どのセーブの指導実績を引き継ぐか）を選びます。'
          : '第2部を突破したセーブから、世界代表チームを編成します。'}
      </div>
      <div className="school-grid">
        {slots.length === 0 && <div className="sub">まだプレイしたセーブがありません。まずは第1部から始めましょう。</div>}
        {slots.map((slot) => {
          const eligible = slot[eligibleKey];
          const inProgress = slot[progressKey];
          return (
            <div key={slot.schoolId} className={`school-card ${eligible ? '' : 'locked'}`}>
              <div className="school-name">{slot.school.name}出身コーチ</div>
              <div className="school-archetype">{slot.school.archetype}</div>
              <div className="school-status">進行状況：{slot.status.label}</div>
              {!eligible && (
                <div className="school-lock">
                  {part === 'part3' ? 'このセーブはまだ第2部をクリアしていません' : '保存選手が足りません'}
                </div>
              )}
              <button className="primary" disabled={!eligible} onClick={() => onSelect(slot.schoolId)}>
                {inProgress ? 'このコーチでつづきから' : 'このコーチで挑戦する'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="action-footer">
        <button onClick={onBack}>タイトルに戻る</button>
      </div>
    </div>
  );
}
