import { STYLE_LABEL, statTotal, getTitlePassiveDesc, SQUAD_MIN, SQUAD_MAX } from '../game/data.js';
import { SCHOOL_LABEL } from '../game/schools.js';

export default function VaultModal({ vault, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>選手保存庫（{vault.length}人）</h2>
        <p style={{ fontSize: 12, color: '#9fd8b6' }}>関東大会に出場した歴代選手。{SQUAD_MIN}人以上貯まったら、ここから{SQUAD_MIN}〜{SQUAD_MAX}人を選抜して第2部「高校挑戦編」のチームを編成できる。</p>
        {vault.length === 0 ? <p>まだ保存された選手はいない。</p> : (
          <div className="vault-grid">
            {vault.map((p) => (
              <div className="vault-card" key={p.id}>
                <div className="title">『{p.title}』</div>
                <div><b>{p.name}</b>（{STYLE_LABEL[p.style]}）</div>
                <div style={{ fontSize: 11, color: '#9fd8b6' }}>出身：{SCHOOL_LABEL[p.school] || '不明'}</div>
                <div style={{ fontSize: 12 }}>総合値 {statTotal(p)} ／ 技 {p.skills.length}/4</div>
                <div style={{ fontSize: 12 }}>{p.record.wins}勝{p.record.losses}敗{p.record.championships > 0 ? `／優勝${p.record.championships}回` : ''}</div>
                {getTitlePassiveDesc(p) ? (
                  <div style={{ fontSize: 11, color: '#9fd8b6' }}>パッシブ: {getTitlePassiveDesc(p)}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12 }}><button onClick={onClose}>閉じる</button></div>
      </div>
    </div>
  );
}
