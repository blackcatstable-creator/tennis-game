import { useState, useEffect } from 'react';
import {
  beginIndividualTournament, afterIndividualBattle, advanceIndividualStage, closeIndividualResult,
  resolveSquadSelectionLeague, advanceSquadSelectionHighlight,
  proceedToIndividualTournament, confirmLineup, afterTeamPositionMatch, closeTeamMatchResult,
  processGraduation, startNewGeneration,
  autoAdvanceBattleTurn, autoFinishBattle,
  canEnterPart2, goToPart2SquadSelect, confirmPart2Squad,
  runPart2Challenge, advancePart2Highlight, finishPart2Overall, afterPart2Match,
  restartPart2, resumePart2, exitPart2ToPart1,
  canEnterPart3, goToPart3Start, confirmPart3RosterPlan, afterWorldPositionMatch,
  advancePart3AfterTieResult, advancePart3AfterStageResult,
  restartPart3, resumePart3, exitPart3ToPart1,
  currentPart,
} from './game/state.js';
import {
  initialRootState, saveRoot, getActiveFlatState, commitFlatState,
  startSchoolSlot, switchToSchool, backToSchoolSelect, resetActiveSlot,
} from './game/root.js';
import Header from './components/Header.jsx';
import TitleScreen from './components/TitleScreen.jsx';
import PartSlotPickerScreen from './components/PartSlotPickerScreen.jsx';
import Part1HomeScreen from './components/Part1HomeScreen.jsx';
import Part2HomeScreen from './components/Part2HomeScreen.jsx';
import Part3HomeScreen from './components/Part3HomeScreen.jsx';
import SchoolSelectScreen from './components/SchoolSelectScreen.jsx';
import RosterTable from './components/RosterTable.jsx';
import PlayerStatusScreen from './components/PlayerStatusScreen.jsx';
import BattleScreen from './components/BattleScreen.jsx';
import IndividualBriefingScreen from './components/IndividualBriefingScreen.jsx';
import IndividualRoundScreen from './components/IndividualRoundScreen.jsx';
import SquadSelectionScreen from './components/SquadSelectionScreen.jsx';
import SquadSelectionResultScreen from './components/SquadSelectionResultScreen.jsx';
import SquadSelectionMatchesScreen from './components/SquadSelectionMatchesScreen.jsx';
import LineupScreen from './components/LineupScreen.jsx';
import TeamMatchResultScreen from './components/TeamMatchResultScreen.jsx';
import GraduationScreen from './components/GraduationScreen.jsx';
import GraduationResultScreen from './components/GraduationResultScreen.jsx';
import Part2SquadSelectScreen from './components/Part2SquadSelectScreen.jsx';
import Part2RoleAssignScreen from './components/Part2RoleAssignScreen.jsx';
import Part2HighlightScreen from './components/Part2HighlightScreen.jsx';
import Part2OverallResultScreen from './components/Part2OverallResultScreen.jsx';
import Part2ClearedScreen from './components/Part2ClearedScreen.jsx';
import Part2FinishedScreen from './components/Part2FinishedScreen.jsx';
import Part3RosterPlanScreen from './components/Part3RosterPlanScreen.jsx';
import Part3TieResultScreen from './components/Part3TieResultScreen.jsx';
import Part3StageResultScreen from './components/Part3StageResultScreen.jsx';
import Part3EliminatedScreen from './components/Part3EliminatedScreen.jsx';
import Part3ChampionScreen from './components/Part3ChampionScreen.jsx';
import VaultModal from './components/VaultModal.jsx';

export default function App() {
  const [root, setRoot] = useState(initialRootState);
  const [nav, setNav] = useState('title');
  const [showVault, setShowVault] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [statusPlayerId, setStatusPlayerId] = useState(null);

  useEffect(() => { saveRoot(root); }, [root]);

  // 現在アクティブな中学のプレイ状態（保存庫vault込みのフラットな形）を既存のstate.js関数にそのまま渡す。
  const state = getActiveFlatState(root);

  // state.js の関数（flatState => flatState）をそのまま呼び、結果をroot（vault＋スロット群）へ書き戻す。
  const run = (fn, ...args) => setRoot((prev) => {
    const flat = getActiveFlatState(prev);
    if (!flat) return prev;
    return commitFlatState(prev, fn(flat, ...args));
  });

  const onAutoTurn = () => run(autoAdvanceBattleTurn);
  const onAutoFinish = () => run(autoFinishBattle);
  const onBattleContinue = () => run((s) => {
    const { type } = s.battleContext;
    if (type === 'individualSingles' || type === 'individualDoubles') return afterIndividualBattle(s);
    if (type === 'worldTie') return afterWorldPositionMatch(s);
    if (type === 'part2Match') return afterPart2Match(s);
    return afterTeamPositionMatch(s);
  });
  const onBeginIndividual = (doublesPairs) => run(beginIndividualTournament, doublesPairs);
  const onAdvanceIndividualStage = () => run(advanceIndividualStage);
  const onCloseIndividualResult = () => run(closeIndividualResult);
  const onResolveSquadSelectionLeague = (leagueAssign, leagueCount) => run(resolveSquadSelectionLeague, leagueAssign, leagueCount);
  const onAdvanceSquadSelectionHighlight = () => run(advanceSquadSelectionHighlight);
  const onProceedToIndividual = () => run(proceedToIndividualTournament);
  const onConfirmLineup = (assignments) => run(confirmLineup, assignments);
  const onCloseTeamMatchResult = () => run(closeTeamMatchResult);
  const onProcessGraduation = () => run(processGraduation);
  const onNewGeneration = () => run(startNewGeneration);
  const runGoToPart2 = () => run((s) => (s.part2 ? resumePart2(s) : goToPart2SquadSelect(s)));
  const onConfirmPart2Squad = (ids) => run(confirmPart2Squad, ids);
  const onStartPart2Challenge = (roles) => run(runPart2Challenge, roles);
  const onAdvancePart2Highlight = () => run(advancePart2Highlight);
  const onFinishPart2Overall = () => run(finishPart2Overall);
  const onRestartPart2 = () => run(restartPart2);
  const onExitPart2 = () => run(exitPart2ToPart1);
  const runGoToPart3 = () => run((s) => (s.part3 ? resumePart3(s) : goToPart3Start(s)));
  const onConfirmPart3RosterPlan = (plans) => run(confirmPart3RosterPlan, plans);
  const onAdvancePart3TieResult = () => run(advancePart3AfterTieResult);
  const onAdvancePart3StageResult = () => run(advancePart3AfterStageResult);
  const onRestartPart3 = () => run(restartPart3);
  const onExitPart3 = () => run(exitPart3ToPart1);

  const onSelectSchool = (schoolId) => setRoot((prev) => (
    prev.slots[schoolId] ? switchToSchool(prev, schoolId) : startSchoolSlot(prev, schoolId)
  ));
  const onBackToSchoolSelect = () => { setStatusPlayerId(null); setRoot((prev) => backToSchoolSelect(prev)); setNav('part1-select'); };
  const onResetActiveSlot = () => {
    if (window.confirm('この中学のセーブデータを削除して最初からやり直します。保存庫や他の中学の進行は残ります。よろしいですか？')) {
      setStatusPlayerId(null);
      setRoot((prev) => resetActiveSlot(prev));
    }
  };

  // タイトル画面からの部選択：第2部・第3部はアクティブな中学スロットがそのまま条件を満たすならホームへ、
  // そうでなければ「どの中学の遠征として挑むか」を選ぶ画面を経由する。
  const onSelectPart = (part) => {
    if (part === 'part1') { setNav('part1-select'); return; }
    if (part === 'part2') { setNav(state && canEnterPart2(state) ? 'part2-home' : 'part2-pick'); return; }
    if (part === 'part3') { setNav(state && canEnterPart3(state) ? 'part3-home' : 'part3-pick'); return; }
  };
  const onPart1SchoolSelected = (schoolId) => { onSelectSchool(schoolId); setNav('part1-home'); };
  const onPart2SlotSelected = (schoolId) => { onSelectSchool(schoolId); setNav('part2-home'); };
  const onPart3SlotSelected = (schoolId) => { onSelectSchool(schoolId); setNav('part3-home'); };
  const enterPart2Home = () => setNav('part2-home');
  const enterPart3Home = () => setNav('part3-home');
  const onEnterPart2FromHome = () => { runGoToPart2(); setNav('play'); };
  const onEnterPart3FromHome = () => { runGoToPart3(); setNav('play'); };

  if (nav === 'title') {
    return <TitleScreen root={root} onSelectPart={onSelectPart} />;
  }
  if (nav === 'part1-select') {
    return (
      <div>
        <SchoolSelectScreen root={root} onSelect={onPart1SchoolSelected} />
        <div className="page-back">
          <button onClick={() => setNav('title')}>タイトルに戻る</button>
        </div>
        <div className="footer-note">テニス育成シミュレーション『THE RISING COURT』MVP ― 第1部・第2部・第3部実装版</div>
      </div>
    );
  }
  if (nav === 'part1-home' && state) {
    return (
      <Part1HomeScreen
        state={state}
        onEnter={() => setNav('play')}
        onSwitchSchool={() => setNav('part1-select')}
        onBackToTitle={() => setNav('title')}
      />
    );
  }
  if (nav === 'part2-pick') {
    return <PartSlotPickerScreen root={root} part="part2" onSelect={onPart2SlotSelected} onBack={() => setNav('title')} />;
  }
  if (nav === 'part2-home' && state) {
    return (
      <Part2HomeScreen
        state={state}
        onEnter={onEnterPart2FromHome}
        onSwitchSlot={() => setNav('part2-pick')}
        onBackToTitle={() => setNav('title')}
      />
    );
  }
  if (nav === 'part3-pick') {
    return <PartSlotPickerScreen root={root} part="part3" onSelect={onPart3SlotSelected} onBack={() => setNav('title')} />;
  }
  if (nav === 'part3-home' && state) {
    return (
      <Part3HomeScreen
        state={state}
        onEnter={onEnterPart3FromHome}
        onSwitchSlot={() => setNav('part3-pick')}
        onBackToTitle={() => setNav('title')}
      />
    );
  }

  if (!state) {
    return <TitleScreen root={root} onSelectPart={onSelectPart} />;
  }

  // 部内戦・大会中を含め、今どの部（第1部／第2部／第3部）の画面にいるかに応じて
  // 「メンバー一覧」に載せるロースターと見出しを出し分ける。
  const part = currentPart(state);
  const rosterTeam = part === 'part3' ? (state.part3 ? state.part3.squad : [])
    : part === 'part2' ? (state.part2 ? state.part2.squad : [])
      : state.team;
  const rosterLabel = part === 'part3' ? '世界代表' : part === 'part2' ? '遠征メンバー' : '部員';

  let content;
  if (showRoster) {
    content = statusPlayerId ? (
      <PlayerStatusScreen
        team={rosterTeam}
        playerId={statusPlayerId}
        onSelectPlayer={setStatusPlayerId}
        onBack={() => setStatusPlayerId(null)}
        title={`${rosterLabel}のステータス確認`}
      />
    ) : (
      <div className="card">
        <div className="card-title-row">
          <h2 style={{ border: 'none', padding: 0 }}>{rosterLabel}一覧</h2>
          <button onClick={() => setShowRoster(false)}>閉じる</button>
        </div>
        <RosterTable team={rosterTeam} onOpenStatus={setStatusPlayerId} />
      </div>
    );
  } else if (state.screen === 'battle') {
    content = (
      <BattleScreen
        state={state}
        onAutoTurn={onAutoTurn}
        onAutoFinish={onAutoFinish}
        onContinue={onBattleContinue}
      />
    );
  } else if (state.screen === 'individualBriefing') {
    content = <IndividualBriefingScreen state={state} onBegin={onBeginIndividual} />;
  } else if (state.screen === 'individualRound') {
    content = <IndividualRoundScreen state={state} onAdvance={onAdvanceIndividualStage} onClose={onCloseIndividualResult} />;
  } else if (state.screen === 'squadSelection') {
    content = (
      <SquadSelectionScreen
        state={state}
        onResolveLeague={onResolveSquadSelectionLeague}
      />
    );
  } else if (state.screen === 'squadSelectionMatches') {
    content = <SquadSelectionMatchesScreen state={state} onNext={onAdvanceSquadSelectionHighlight} />;
  } else if (state.screen === 'squadSelectionResult') {
    content = <SquadSelectionResultScreen state={state} onProceed={onProceedToIndividual} />;
  } else if (state.screen === 'lineup') {
    content = <LineupScreen state={state} onConfirm={onConfirmLineup} />;
  } else if (state.screen === 'teamMatchResult') {
    content = <TeamMatchResultScreen state={state} onClose={onCloseTeamMatchResult} />;
  } else if (state.screen === 'graduation') {
    content = <GraduationScreen onProcess={onProcessGraduation} />;
  } else if (state.screen === 'graduationResult') {
    content = <GraduationResultScreen state={state} onNewGen={onNewGeneration} onGoToPart2={enterPart2Home} />;
  } else if (state.screen === 'part2SquadSelect') {
    content = <Part2SquadSelectScreen state={state} onConfirm={onConfirmPart2Squad} />;
  } else if (state.screen === 'part2RoleAssign') {
    content = <Part2RoleAssignScreen state={state} onStart={onStartPart2Challenge} />;
  } else if (state.screen === 'part2Highlight') {
    content = <Part2HighlightScreen state={state} onNext={onAdvancePart2Highlight} />;
  } else if (state.screen === 'part2OverallResult') {
    content = <Part2OverallResultScreen state={state} onFinish={onFinishPart2Overall} />;
  } else if (state.screen === 'part2Cleared') {
    content = <Part2ClearedScreen state={state} onExit={onExitPart2} onRestart={onRestartPart2} onGoToPart3={enterPart3Home} />;
  } else if (state.screen === 'part2Finished') {
    content = <Part2FinishedScreen state={state} onExit={onExitPart2} onRestart={onRestartPart2} />;
  } else if (state.screen === 'part3RosterPlan') {
    content = <Part3RosterPlanScreen state={state} onConfirm={onConfirmPart3RosterPlan} />;
  } else if (state.screen === 'part3TieResult') {
    content = <Part3TieResultScreen state={state} onNext={onAdvancePart3TieResult} />;
  } else if (state.screen === 'part3StageResult') {
    content = <Part3StageResultScreen state={state} onNext={onAdvancePart3StageResult} />;
  } else if (state.screen === 'part3Eliminated') {
    content = <Part3EliminatedScreen state={state} onExit={onExitPart3} onRestart={onRestartPart3} />;
  } else if (state.screen === 'part3Champion') {
    content = <Part3ChampionScreen state={state} onExit={onExitPart3} onRestart={onRestartPart3} />;
  }

  return (
    <div>
      <Header
        state={state}
        onShowVault={() => setShowVault(true)}
        onShowRoster={() => { setStatusPlayerId(null); setShowRoster(true); }}
        onReset={onResetActiveSlot}
        onGoToPart2={enterPart2Home}
        canEnterPart2={canEnterPart2(state)}
        onGoToPart3={enterPart3Home}
        canEnterPart3={canEnterPart3(state)}
        onBackToSchoolSelect={onBackToSchoolSelect}
        onBackToTitle={() => setNav('title')}
        rosterLabel={rosterLabel}
        canShowRoster={rosterTeam.length > 0}
      />
      {content}
      {showVault && <VaultModal vault={state.vault} onClose={() => setShowVault(false)} />}
      <div className="footer-note">テニス育成シミュレーション『THE RISING COURT』MVP ― 第1部・第2部・第3部実装版</div>
    </div>
  );
}
