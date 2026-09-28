import {
  STYLE_LABEL, HAND_LABEL, HIT_POINT_LABEL, STATS, STAT_LABEL, SKILL_CATEGORY_LABEL,
  DETAIL_STATS, DETAIL_STAT_LABEL, getDetailStats, getDoublesProfile, getAffinity, personalityOf, statTotal,
} from '../game/data.js';
import Bar from './Bar.jsx';

export default function PlayerStatusScreen({ team, playerId, onSelectPlayer, onBack, title = 'ステータス確認' }) {
  const sorted = [...team].sort((a, b) => a.rank - b.rank);
  const player = sorted.find((p) => p.id === playerId) || sorted[0];
  if (!player) return null;

  const detail = getDetailStats(player);
  const doubles = getDoublesProfile(player);
  const personality = personalityOf(player);
  const mates = team
    .filter((t) => t.id !== player.id)
    .map((t) => ({ mate: t, affinity: getAffinity(player, t) }))
    .sort((a, b) => b.affinity.score - a.affinity.score);

  return (
    <div className="card">
      <div className="card-title-row">
        <h2 style={{ border: 'none', padding: 0 }}>{title}</h2>
        <button onClick={onBack}>部員一覧へ戻る</button>
      </div>

      <div className="pair-select-grid player-picker" style={{ marginBottom: 14 }}>
        {sorted.map((p) => (
          <button
            key={p.id}
            className={`chip ${p.id === player.id ? 'selected' : ''}`}
            onClick={() => onSelectPlayer(p.id)}
          >
            <div className="chip-name">{p.name}</div>
            <div className="chip-sub">{p.grade}年／序列{p.rank}／総合{statTotal(p)}</div>
          </button>
        ))}
      </div>

      <h2>{player.name} の詳細ステータス</h2>
      <div className="sub" style={{ marginBottom: 12 }}>
        {player.grade}年 ／ 部内序列{player.rank}位 ／ {STYLE_LABEL[player.style]}（{HAND_LABEL[player.hand]}・{HIT_POINT_LABEL[player.hitPoint]}） ／ 性格：{personality}
        {player.isAce ? <> ／ <span className="tag" style={{ background: '#7a5a13', color: '#ffe6a3' }}>{player.aceTitle}</span></> : null}
        {player.title ? <> ／ 二つ名『{player.title}』</> : null}
      </div>

      <div className="detail-grid">
        <div>
          <h3>基礎ステータス（総合値 {statTotal(player)}）</h3>
          {STATS.map((s) => <Bar key={s} label={STAT_LABEL[s]} value={player.stats[s]} cls="statval" />)}
        </div>
        <div>
          <h3>テニス詳細ステータス</h3>
          {DETAIL_STATS.map((s) => <Bar key={s} label={DETAIL_STAT_LABEL[s]} value={detail[s]} cls="statval" />)}
        </div>
      </div>

      <h3>ダブルス適正 <span className={`rank-badge rank-${doubles.rank}`}>{doubles.rank}ランク</span></h3>
      <div className="detail-grid">
        <div>
          <Bar label="前衛適性" value={doubles.forward} cls="doubles" />
          <Bar label="後衛適性" value={doubles.back} cls="doubles" />
        </div>
        <div>
          <Bar label="ポーチ" value={doubles.poach} cls="doubles" />
          <Bar label="連携力" value={doubles.synergy} cls="doubles" />
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#9fd8b6', marginBottom: 14 }}>{doubles.formation}</div>

      <h3>コンディション／状態</h3>
      <div style={{ fontSize: 13, marginBottom: 14 }}>
        コンディション {Math.round(player.condition)}% ／ {player.injured ? <span style={{ color: '#ff8a80' }}>怪我療養中</span> : '良好'} ／ 戦績 {player.record.wins}勝{player.record.losses}敗
        {player.record.championships > 0 && <>／優勝{player.record.championships}回</>}
      </div>

      <h3>習得必殺技（{player.skills.length}/4）</h3>
      {player.skills.length > 0 ? (
        <div style={{ fontSize: 13, marginBottom: 14 }}>
          {player.skills.map((s) => (
            <div key={s.id}>
              {s.awakened ? <span className="tag saved" style={{ marginRight: 6 }}>覚醒</span> : null}
              『{s.name}』（{SKILL_CATEGORY_LABEL[s.category]}／Lv{s.level}/3／消費{s.cost}）
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#9fd8b6', marginBottom: 14 }}>まだ必殺技を習得していない。高負荷トレ・イベント・部内戦・試合中の覚醒などで身につく。</div>
      )}

      <h3>チーム内相性度</h3>
      {mates.length === 0 ? (
        <div style={{ fontSize: 12, color: '#9fd8b6' }}>他に部員がいない。</div>
      ) : (
        <div className="affinity-list">
          {mates.map(({ mate, affinity }, i) => (
            <div className="affinity-row" key={mate.id}>
              <div className="affinity-name">{i === 0 ? <span className="tag saved">推奨</span> : null}{mate.name}</div>
              <div className="affinity-reason">{affinity.reason}</div>
              <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill doubles" style={{ width: `${affinity.score}%` }} /></div>
              <div className="affinity-score">{affinity.score}（{affinity.label}）</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 14 }}><button onClick={onBack}>部員一覧へ戻る</button></div>
    </div>
  );
}
