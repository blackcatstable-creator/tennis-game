import { useState } from 'react';
import { STYLE_LABEL, statTotal, computeSquadRequiredPairs } from '../game/data.js';

const LEAGUE_COUNT_OPTIONS = [1, 2, 3, 4];
const STYLE_COLOR = {
  power: '#e0574f', speed: '#4fb87a', technique: '#5a9bd8', counter: '#c77dd6', allround: '#f0b74a',
};
const STAT_BAR_MAX = 560;

function seededLeagueAssign(eligible, leagueCount) {
  const sorted = [...eligible].sort((a, b) => a.rank - b.rank);
  const assign = {};
  sorted.forEach((p, i) => {
    const block = Math.floor(i / leagueCount);
    const pos = i % leagueCount;
    assign[p.id] = block % 2 === 0 ? pos : leagueCount - 1 - pos;
  });
  return assign;
}

function randomLeagueAssign(eligible, leagueCount) {
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const assign = {};
  shuffled.forEach((p, i) => { assign[p.id] = i % leagueCount; });
  return assign;
}

function PlayerToken({ p, selected, onClick }) {
  const pct = Math.min(100, Math.round((statTotal(p) / STAT_BAR_MAX) * 100));
  return (
    <button
      className={`player-token${selected ? ' selected' : ''}`}
      title={`${p.name}／序列${p.rank}／${STYLE_LABEL[p.style]}／総合${statTotal(p)}`}
      onClick={(e) => { e.stopPropagation(); onClick(p.id); }}
    >
      <span className="rank-dot">{p.rank}</span>
      <span className="style-dot" style={{ background: STYLE_COLOR[p.style] || '#9fd8b6' }} />
      <span className="token-name">{p.name}</span>
      <span className="token-stat-bar"><span className="token-stat-fill" style={{ width: `${pct}%` }} /></span>
    </button>
  );
}

export default function SquadSelectionScreen({ state, onResolveLeague }) {
  const seasonLabel = state.pendingSeason === 'summer' ? '夏' : '冬';
  const eligible = state.team;
  const requiredPairs = computeSquadRequiredPairs(eligible.length);

  const [leagueCount, setLeagueCount] = useState(() => Math.min(4, Math.max(1, Math.floor(eligible.length / 2))));
  const [leagueAssign, setLeagueAssign] = useState({});
  const [selectedId, setSelectedId] = useState(null);

  const sortedEligible = [...eligible].sort((a, b) => a.rank - b.rank);

  function changeLeagueCount(n) {
    setLeagueCount(n);
    setLeagueAssign({});
    setSelectedId(null);
  }

  function onTokenClick(id) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function onZoneClick(leagueIdx) {
    if (selectedId == null) return;
    setLeagueAssign((prev) => {
      if (leagueIdx === null) { const next = { ...prev }; delete next[selectedId]; return next; }
      return { ...prev, [selectedId]: leagueIdx };
    });
    setSelectedId(null);
  }

  const unassigned = sortedEligible.filter((p) => leagueAssign[p.id] === undefined);
  const leagueMembers = Array.from({ length: leagueCount }, (_, i) => sortedEligible.filter((p) => leagueAssign[p.id] === i));
  const leagueReady = unassigned.length === 0 && leagueMembers.every((m) => m.length !== 1);

  return (
    <div className="card">
      <h2>部内戦：{seasonLabel}の代表選抜</h2>
      <div className="sub" style={{ marginBottom: 10 }}>
        {requiredPairs === 0
          ? '部員数が少ないため誰も脱落しないが、リーグ戦で成長のチャンスを与えられる。'
          : '各リーグ上位2人が団体戦（S1〜D2）の代表になる。選手をタップしてから配属先のリーグをタップ。'}
      </div>
      <div className="toolbar">
        <div className="segmented">
          {LEAGUE_COUNT_OPTIONS.map((n) => (
            <button key={n} className={leagueCount === n ? 'primary' : ''} onClick={() => changeLeagueCount(n)}>
              {n}リーグ
            </button>
          ))}
        </div>
        <span className="toolbar-divider" />
        <button onClick={() => { setLeagueAssign(seededLeagueAssign(eligible, leagueCount)); setSelectedId(null); }}>均等に自動振り分け</button>
        <button onClick={() => { setLeagueAssign(randomLeagueAssign(eligible, leagueCount)); setSelectedId(null); }}>ランダムに振り分け</button>
        <button onClick={() => { setLeagueAssign({}); setSelectedId(null); }}>リセット</button>
      </div>

      <div className="league-column league-pool" onClick={() => onZoneClick(null)}>
        <div className="league-column-header"><span>未配属</span><span>{unassigned.length}人</span></div>
        <div className="player-token-list">
          {unassigned.map((p) => (
            <PlayerToken key={p.id} p={p} selected={selectedId === p.id} onClick={onTokenClick} />
          ))}
          {unassigned.length === 0 && <span className="sub">全員配属済み</span>}
        </div>
      </div>

      <div className="league-board">
        {leagueMembers.map((members, i) => (
          <div
            key={i}
            className={`league-column${members.length === 1 ? ' league-column-warn' : ''}`}
            onClick={() => onZoneClick(i)}
          >
            <div className="league-column-header"><span>リーグ{i + 1}</span><span>{members.length}人</span></div>
            <div className="player-token-list">
              {members.map((p) => (
                <PlayerToken key={p.id} p={p} selected={selectedId === p.id} onClick={onTokenClick} />
              ))}
              {members.length === 0 && <span className="sub">タップで配属</span>}
            </div>
            {members.length === 1 && <div className="sub" style={{ color: '#ff8a80', marginTop: 4 }}>1人だけでは対戦できません</div>}
          </div>
        ))}
      </div>

      <div className="action-footer">
        <button
          className="primary"
          disabled={sortedEligible.length > 0 && !leagueReady}
          onClick={() => onResolveLeague(leagueAssign, leagueCount)}
        >
          {sortedEligible.length === 0 || leagueReady ? 'この組み分けで部内戦を行う' : '全員を割り振ってください'}
        </button>
      </div>
    </div>
  );
}
