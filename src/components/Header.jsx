import { useState } from 'react';
import { coachLevelInfo } from '../game/data.js';
import { schoolById } from '../game/schools.js';
import { currentPart } from '../game/state.js';

// PCでは操作ボタンを横に並べ、スマホ（狭い画面）では画面上部に固定したコンパクトなバーに
// 「メニュー」ボタンだけを置き、タップでボタン群を開閉する。
export default function Header({
  state, onShowVault, onShowRoster, onReset, onGoToPart2, canEnterPart2, onGoToPart3, canEnterPart3,
  onBackToSchoolSelect, onBackToTitle, rosterLabel, canShowRoster,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const part = currentPart(state);
  const inPart2 = part === 'part2';
  const inPart3 = part === 'part3';
  const partLabel = inPart3 ? '第3部：世界戦編' : inPart2 ? '第2部：高校挑戦編' : '第1部：中学・部活編';
  const seasonText = inPart3
    ? `世界代表 ${state.part3 ? state.part3.squad.length : 0}人`
    : inPart2
      ? `遠征メンバー ${state.part2 ? state.part2.squad.length : 0}人`
      : `${state.year}年目 第${state.week}週`;
  const coach = coachLevelInfo(state.coach ? state.coach.exp : 0);
  const school = schoolById(state.schoolId);
  // メニュー内のボタンを押したらメニューを閉じてから各処理を行う。
  const act = (fn) => () => { setMenuOpen(false); fn(); };

  return (
    <header className={`app-header${menuOpen ? ' menu-open' : ''}`}>
      <div className="app-header-bar">
        <div className="app-header-info">
          <div className="title"><span className="title-brand">THE RISING COURT — </span>{school.name} ／ {partLabel}</div>
          <div className="sub">
            {seasonText} ／ 世代 {state.genNumber} ／ 保存庫 {state.vault.length}人 ／ コーチLv.{coach.level}<span className="sub-detail">（経験値 {coach.into}/{coach.next}）</span>
          </div>
        </div>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-label="メニューを開閉"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
          {menuOpen ? '閉じる' : 'メニュー'}
        </button>
      </div>
      <div className="header-actions">
        {!inPart2 && !inPart3 && canEnterPart2 && <button onClick={act(onGoToPart2)}>{state.part2 ? '第2部へ' : '第2部に挑戦する'}</button>}
        {!inPart2 && !inPart3 && canEnterPart3 && <button onClick={act(onGoToPart3)}>{state.part3 ? '第3部へ' : '第3部に挑戦する'}</button>}
        {canShowRoster && <button onClick={act(onShowRoster)}>{rosterLabel}一覧を見る</button>}
        <button onClick={act(onShowVault)}>保存庫を見る</button>
        <button onClick={act(onBackToSchoolSelect)}>学校を切り替える</button>
        <button onClick={act(onBackToTitle)}>タイトルに戻る</button>
        <button className="danger" onClick={act(onReset)}>この中学のセーブを削除</button>
      </div>
    </header>
  );
}
