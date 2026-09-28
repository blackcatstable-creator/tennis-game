import { canAnyEnterPart2, canAnyEnterPart3 } from '../game/root.js';
import { SQUAD_MIN } from '../game/data.js';

const PARTS = [
  {
    key: 'part1',
    num: '第1部',
    name: '中学・部活編',
    tagline: '入部から引退まで。選手を鍛え、年2回の公式戦で結果を出す。',
    icon: (
      <svg viewBox="0 0 48 48" className="part-icon">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M10 24a14 14 0 0 1 28 0" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M24 8v32M8 24h32" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: 'part2',
    num: '第2部',
    name: '高校挑戦編',
    tagline: '保存選手で遠征チームを編成し、20番コートから駆け上がる。',
    icon: (
      <svg viewBox="0 0 48 48" className="part-icon">
        <rect x="8" y="30" width="8" height="10" fill="currentColor" opacity="0.55" />
        <rect x="20" y="20" width="8" height="20" fill="currentColor" opacity="0.75" />
        <rect x="32" y="8" width="8" height="32" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'part3',
    num: '第3部',
    name: '世界戦編',
    tagline: '5番以内に到達したメンバーで世界大会へ。頂点を目指す。',
    icon: (
      <svg viewBox="0 0 48 48" className="part-icon">
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M24 6v36M6 24h36M9 14a24 24 0 0 0 30 0M9 34a24 24 0 0 1 30 0" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.6" />
      </svg>
    ),
  },
];

export default function TitleScreen({ root, onSelectPart }) {
  const unlocked = {
    part1: true,
    part2: canAnyEnterPart2(root),
    part3: canAnyEnterPart3(root),
  };
  const lockReason = {
    part2: `保存庫の歴代選手が${SQUAD_MIN}人以上になると挑戦できる（現在${root.vault.length}人）`,
    part3: 'いずれかの中学で第2部をクリアすると挑戦できる',
  };
  const playedSchools = Object.keys(root.slots).length;

  return (
    <div className="title-screen">
      <div className="title-court-lines" aria-hidden="true" />
      <div className="title-inner">
        <div className="title-logo">
          <div className="title-logo-sub">TENNIS ACADEMY SIMULATION</div>
          <h1>THE RISING COURT</h1>
        </div>
        <div className="part-select-grid">
          {PARTS.map((part) => {
            const isUnlocked = unlocked[part.key];
            return (
              <button
                key={part.key}
                type="button"
                className={`part-card ${isUnlocked ? '' : 'locked'}`}
                disabled={!isUnlocked}
                onClick={() => onSelectPart(part.key)}
              >
                {part.icon}
                <div className="part-card-num">{part.num}</div>
                <div className="part-card-name">{part.name}</div>
                <div className="part-card-tagline">{part.tagline}</div>
                {!isUnlocked && (
                  <div className="part-card-lock">
                    <span className="lock-badge">🔒 未解禁</span>
                    <span className="lock-reason">{lockReason[part.key]}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="title-footer-stats">
          保存庫 {root.vault.length}人の歴代選手 ／ プレイ済みの中学 {playedSchools}校
        </div>
      </div>
    </div>
  );
}
