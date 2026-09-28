import { useState } from 'react';
import {
  STYLE_LABEL, HAND_LABEL, HIT_POINT_LABEL, statTotal, getAffinity, getDoublesProfile,
  counterHandOf, counterHitPointOf, TOURNAMENT_STAGES, stageChampionRounds, recommendPartners,
} from '../game/data.js';

// data.js内のSTYLE_ADV（パワー→テクニック→スピード→カウンター→パワーの4すくみ）の逆引き。
// 「相手のスタイルに対して何型なら有利を取れるか」をスカウティング画面のヒントとして示す。
const STYLE_BEATEN_BY = { technique: 'power', speed: 'technique', counter: 'speed', power: 'counter' };
function counterStyleOf(style) { return STYLE_BEATEN_BY[style] || null; }

const SLOTS = [
  { key: 's1', label: 'S1', group: 'singles' },
  { key: 's2', label: 'S2', group: 'singles' },
  { key: 's3', label: 'S3', group: 'singles' },
  { key: 'd1a', label: 'D1（前衛/後衛1）', group: 'd1' },
  { key: 'd1b', label: 'D1（前衛/後衛2）', group: 'd1' },
  { key: 'd2a', label: 'D2（前衛/後衛1）', group: 'd2' },
  { key: 'd2b', label: 'D2（前衛/後衛2）', group: 'd2' },
];
const PAIR_PARTNER_KEY = { d1a: 'd1b', d1b: 'd1a', d2a: 'd2b', d2b: 'd2a' };

export default function LineupScreen({ state, onConfirm }) {
  const winners = state.lineup.winners;
  const players = winners.map((id) => state.team.find((p) => p.id === id)).filter(Boolean);
  const stageIndex = state.teamStageIndex;
  const stage = TOURNAMENT_STAGES[stageIndex];
  const seeded = stageIndex === 0 && state.teamDistrictCleared;
  const roundsNeeded = (seeded && stage.team.seedRounds) ? stage.team.seedRounds : stage.team.rounds;
  const championRounds = stageChampionRounds(stage, 'team');
  const scouting = state.teamMatchScouting;
  const scoutedMembers = scouting ? [...scouting.roster.members].sort((a, b) => statTotal(b) - statTotal(a)) : [];
  const [assign, setAssign] = useState({ s1: '', s2: '', s3: '', d1a: '', d1b: '', d2a: '', d2b: '' });

  function nameOf(id) { return players.find((p) => p.id === id)?.name || ''; }

  function usedElsewhere(slotKey) {
    return new Set(Object.entries(assign).filter(([k, v]) => k !== slotKey && v).map(([, v]) => v));
  }

  function optionsFor(slotKey) {
    const used = usedElsewhere(slotKey);
    return players.filter((p) => !used.has(p.id));
  }

  function setSlot(slotKey, value) {
    setAssign((prev) => ({ ...prev, [slotKey]: value }));
  }

  const assignedIds = Object.values(assign).filter(Boolean);
  const allFilled = SLOTS.every((s) => assign[s.key]);
  const noDup = new Set(assignedIds).size === assignedIds.length;
  const ready = allFilled && noDup;
  const reserveId = ready ? winners.find((id) => !assignedIds.includes(id)) : null;

  function handleConfirm() {
    onConfirm({
      s1: assign.s1,
      s2: assign.s2,
      s3: assign.s3,
      d1: [assign.d1a, assign.d1b],
      d2: [assign.d2a, assign.d2b],
      reserve: reserveId,
    });
  }

  function recommendationForSlot(slotKey) {
    const partnerKey = PAIR_PARTNER_KEY[slotKey];
    if (!partnerKey) return null;
    const selectedId = assign[partnerKey];
    if (!selectedId || assign[slotKey]) return null;
    const selected = players.find((p) => p.id === selectedId);
    if (!selected) return null;
    const candidates = optionsFor(slotKey);
    return recommendPartners(selected, candidates).slice(0, 3);
  }

  function pairHint(aId, bId) {
    if (!aId || !bId) return null;
    const a = players.find((p) => p.id === aId);
    const b = players.find((p) => p.id === bId);
    if (!a || !b) return null;
    const affinity = getAffinity(a, b);
    const dp = getDoublesProfile(a);
    return `相性：${affinity.label}（${affinity.reason}）／ペア総合ランク目安 ${dp.rank}`;
  }

  return (
    <div className="card">
      <h2>オーダー編成：{stage.label}</h2>
      <div className="sub" style={{ marginBottom: 10 }}>
        参加{stage.team.participants}チーム中、{roundsNeeded}回戦を勝ち抜けば{stage.team.advance ? `突破（勝ち抜け${stage.team.advance}チーム）` : '全国制覇'}。
        {stage.team.advance ? `進出決定後も、${stage.label}優勝を懸けて${championRounds}回戦まで試合は続く。` : ''}
        {seeded && '前回大会の実績によりシード出場（1回戦少なく突破可能）。'}
      </div>
      <div className="sub" style={{ marginBottom: 10 }}>
        代表{players.length}人をS1〜D2の7枠に振り分ける。{players.length > 7 ? `余った${players.length - 7}人は補欠。` : ''}
      </div>

      {scouting && (
        <>
          <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>スカウティング：{scouting.roster.schoolName}</h3>
          <div className="sub" style={{ marginBottom: 8 }}>
            相手の実際のオーダー（配置）は試合が始まるまで分からない。メンバーの実力・スタイルから読み合ってオーダーを組もう。
          </div>
          <div className="pair-select-grid" style={{ marginBottom: 14 }}>
            {scoutedMembers.map((m) => (
              <div key={m.id} className="chip">
                <div className="chip-name">{m.name}</div>
                <div className="chip-sub">
                  {STYLE_LABEL[m.style]}（{HAND_LABEL[m.hand]}・{HIT_POINT_LABEL[m.hitPoint]}）／総合{statTotal(m)}{m.skills.length ? '／必殺技の気配あり' : ''}
                </div>
                {(counterStyleOf(m.style) || counterHandOf(m.hand) || counterHitPointOf(m.hitPoint)) && (
                  <div className="chip-sub" style={{ fontSize: 10 }}>
                    有利を取れる：{[
                      counterStyleOf(m.style) && `スタイル：${STYLE_LABEL[counterStyleOf(m.style)]}`,
                      counterHandOf(m.hand) && HAND_LABEL[counterHandOf(m.hand)],
                      counterHitPointOf(m.hitPoint) && HIT_POINT_LABEL[counterHitPointOf(m.hitPoint)],
                    ].filter(Boolean).join('／')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ fontSize: 13, color: '#9fd8b6' }}>代表{players.length}人</h3>
      <div className="pair-select-grid" style={{ marginBottom: 14 }}>
        {players.map((p) => (
          <div key={p.id} className={`chip ${assignedIds.includes(p.id) ? 'chip-used' : ''}`}>
            <div className="chip-name">{p.name}</div>
            <div className="chip-sub">{STYLE_LABEL[p.style]}／総合{statTotal(p)}</div>
          </div>
        ))}
      </div>

      <div className="lineup-grid">
        {['singles', 'd1', 'd2'].map((group) => (
          <div key={group} className="lineup-group">
            {SLOTS.filter((s) => s.group === group).map((slot) => (
              <div key={slot.key} className="lineup-slot">
                <div className="lineup-slot-label">{slot.label}</div>
                <select value={assign[slot.key]} onChange={(e) => setSlot(slot.key, e.target.value)}>
                  <option value="">未選択</option>
                  {optionsFor(slot.key).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {recommendationForSlot(slot.key) && (
                  <div className="affinity-list" style={{ marginTop: 4 }}>
                    {recommendationForSlot(slot.key).map(({ player: cand, affinity: aff }, j) => (
                      <div className="affinity-row" key={cand.id}>
                        <div className="affinity-name">{j === 0 ? <span className="tag saved">推奨</span> : null}{cand.name}</div>
                        <div className="affinity-reason">{aff.reason}</div>
                        <div className="affinity-score">{aff.score}（{aff.label}）</div>
                        <button onClick={() => setSlot(slot.key, cand.id)}>採用</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {group === 'd1' && assign.d1a && assign.d1b && (
              <div className="sub" style={{ fontSize: 11 }}>{pairHint(assign.d1a, assign.d1b)}</div>
            )}
            {group === 'd2' && assign.d2a && assign.d2b && (
              <div className="sub" style={{ fontSize: 11 }}>{pairHint(assign.d2a, assign.d2b)}</div>
            )}
          </div>
        ))}
      </div>

      <div className="sub" style={{ marginTop: 10 }}>
        補欠：{reserveId ? nameOf(reserveId) : '（全枠決定後に自動表示）'}
      </div>

      <div className="action-footer">
        <button className="primary" disabled={!ready} onClick={handleConfirm}>オーダー確定</button>
      </div>
    </div>
  );
}
