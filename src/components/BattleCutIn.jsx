const KIND_LABEL = {
  match: 'マッチポイント!',
  set: 'セットポイント!',
  game: 'ゲームポイント!',
  skill: '必殺技、炸裂!',
};

// 試合中の重要な場面（ゲーム/セット/マッチが決した瞬間、必殺技発動時）に一瞬だけ被せる
// 「テニスをしている風」の簡易カットイン。BattleScreen側でlastTurnから内容を組み立てて渡す。
export default function BattleCutIn({ data }) {
  const { kind, atkName, defName, winnerName, skillName, skillOwnerName } = data;
  const subLine = kind === 'match' && winnerName ? `${winnerName}の勝利！`
    : winnerName ? `${winnerName}が奪う！`
      : null;

  return (
    <div className="cutin-overlay">
      <div className="cutin-scene">
        <svg viewBox="0 0 320 180" className="cutin-court" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="320" height="180" fill="#0a1f16" />
          <rect x="18" y="18" width="284" height="144" fill="none" stroke="#3f8f63" strokeWidth="2" />
          <line x1="160" y1="18" x2="160" y2="162" stroke="#3f8f63" strokeWidth="1.5" />
          <line x1="18" y1="90" x2="302" y2="90" stroke="#3f8f63" strokeWidth="1.5" />
          <g className="cutin-player cutin-player-left">
            <circle cx="72" cy="68" r="10" fill="#f0c96a" />
            <rect x="65" y="78" width="14" height="38" rx="6" fill="#f0c96a" />
            <line x1="79" y1="86" x2="112" y2="58" stroke="#f0c96a" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="cutin-player cutin-player-right">
            <circle cx="248" cy="112" r="10" fill="#9fd8b6" />
            <rect x="241" y="122" width="14" height="38" rx="6" fill="#9fd8b6" />
          </g>
          <circle className="cutin-ball" cx="112" cy="58" r="5" fill="#fff" />
        </svg>
      </div>
      <div className={`cutin-banner cutin-${kind}`}>
        <div className="cutin-kind">{KIND_LABEL[kind]}</div>
        <div className="cutin-vs">{atkName} vs {defName}</div>
        {skillName && (
          <div className="cutin-detail">{skillOwnerName}の『{skillName}』</div>
        )}
        {subLine && <div className="cutin-winner">{subLine}</div>}
      </div>
    </div>
  );
}
