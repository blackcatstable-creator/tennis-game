import { STYLE_LABEL, HAND_LABEL, HIT_POINT_LABEL } from '../game/data.js';
import Bar from './Bar.jsx';

export default function CombatantPanel({ combatant, highlight, title, fx }) {
  return (
    <div className={`combatant-panel${fx ? ` fx-${fx}` : ''}`} style={highlight ? { outline: '2px solid #f0b74a' } : {}}>
      <h3>{title ? `${title} ` : ''}{combatant.ref.name}{combatant.ref.isPair ? '（ペア）' : ''}</h3>
      <div className="sub" style={{ fontSize: 11, color: '#9fd8b6' }}>
        {STYLE_LABEL[combatant.ref.style]}
        {combatant.ref.hand && combatant.ref.hitPoint ? `（${HAND_LABEL[combatant.ref.hand]}・${HIT_POINT_LABEL[combatant.ref.hitPoint]}）` : ''}
      </div>
      <Bar label="スタミナ" value={combatant.stamina} cls="stamina" />
      <Bar label="テンション" value={combatant.tension} cls="tension" />
      <Bar label="メンタル" value={combatant.mental} cls="mental" />
      {combatant.mental <= 0 && <div style={{ color: '#ff8a80', fontSize: 12 }}>呑まれ状態：判定大幅マイナス、必殺技使用不可</div>}
      {combatant.ref.skills && combatant.ref.skills.length > 0 && (
        <div style={{ fontSize: 11, marginTop: 6, color: '#9fd8b6' }}>
          技: {combatant.ref.skills.map((s) => s.name).join('、')}
        </div>
      )}
    </div>
  );
}
