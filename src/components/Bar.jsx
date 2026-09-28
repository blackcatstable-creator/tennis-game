import { clamp } from '../game/data.js';

export default function Bar({ label, value, cls }) {
  return (
    <div className="bar-wrap">
      <span className="label">{label}</span>
      <div className="bar-track"><div className={`bar-fill ${cls}`} style={{ width: `${clamp(value, 0, 100)}%` }} /></div>
      <span>{Math.round(value)}</span>
    </div>
  );
}
