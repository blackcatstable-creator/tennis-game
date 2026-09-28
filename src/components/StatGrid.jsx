import { STATS, STAT_LABEL } from '../game/data.js';

export default function StatGrid({ stats }) {
  return (
    <div className="stat-grid">
      {STATS.map((s) => <div key={s}><span>{STAT_LABEL[s]}</span><span>{stats[s]}</span></div>)}
    </div>
  );
}
