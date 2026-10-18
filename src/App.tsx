import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  PhoneCall,
  Users,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  Award,
  Play,
  ShieldCheck,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { QUESTIONS_BANK, PRIZE_LADDER, STAGE_INFO, Question } from './data/questions';
import { soundFX } from './utils/soundEffects';

type GameState = 'TITLE_MENU' | 'PLAYING' | 'STAGE_TRANSITION' | 'GAME_OVER' | 'VICTORY' | 'WALKED_AWAY';
type ActiveView = 'arena' | 'bank';

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'] as const;

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('arena');
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'IDLE' | 'LOCKED' | 'CORRECT' | 'WRONG'>('IDLE');
  const [visibleOptionsCount, setVisibleOptionsCount] = useState<number>(0);

  const [lifelinesUsed, setLifelinesUsed] = useState<{
    fiftyFifty: boolean;
    phoneFriend: boolean;
    askAudience: boolean;
  }>({
    fiftyFifty: false,
    phoneFriend: false,
    askAudience: false,
  });

  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [friendModalData, setFriendModalData] = useState<Question['friendAdvice'] | null>(null);
  const [audiencePollData, setAudiencePollData] = useState<number[] | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedBankStage, setSelectedBankStage] = useState<1 | 2 | 3>(1);

  const currentQuestion: Question = QUESTIONS_BANK[currentQuestionIndex];
  const currentPrizeTier = PRIZE_LADDER[currentQuestionIndex];

  const earnedPrize = useMemo(() => {
    if (currentQuestionIndex === 0) return '0';
    return PRIZE_LADDER[currentQuestionIndex - 1].amount;
  }, [currentQuestionIndex]);

  const safeHavenPrize = useMemo(() => {
    if (currentQuestionIndex >= 10) return PRIZE_LADDER[9].amount;
    if (currentQuestionIndex >= 5) return PRIZE_LADDER[4].amount;
    return '0';
  }, [currentQuestionIndex]);

  // Play the opening Main Theme automatically as soon as the game opens on TITLE_MENU
  useEffect(() => {
    if (gameState === 'TITLE_MENU' && activeView === 'arena') {
      soundFX.playMainTheme();
    }
    return () => {
      if (gameState === 'TITLE_MENU') {
        soundFX.stopBackgroundMusic();
      }
    };
  }, [gameState, activeView]);

  // Sequential Reveal of Options (أ -> ب -> ج -> د) + Real Millionaire Background Music during gameplay
  useEffect(() => {
    if (gameState !== 'PLAYING' || activeView !== 'arena') {
      return;
    }

    setVisibleOptionsCount(0);
    if (currentQuestionIndex === 0 || currentQuestionIndex === 5 || currentQuestionIndex === 10) {
      soundFX.playLetsPlay();
    }
    const musicStartDelay =
      currentQuestionIndex === 0 || currentQuestionIndex === 5 || currentQuestionIndex === 10
        ? 2200
        : 150;

    const musicTimer = window.setTimeout(() => {
      soundFX.startQuestionMusic(currentQuestionIndex);
    }, musicStartDelay);

    const timers: number[] = [musicTimer];
    for (let i = 1; i <= 4; i++) {
      const t = window.setTimeout(() => {
        setVisibleOptionsCount(i);
        soundFX.playOptionAppear(i - 1);
      }, i * 520);
      timers.push(t);
    }

    return () => {
      timers.forEach((t) => clearTimeout(t));
      soundFX.stopBackgroundMusic();
    };
  }, [gameState, currentQuestionIndex, activeView]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundFX.setMuted(nextMuted);
    if (!nextMuted && activeView === 'arena') {
      if (gameState === 'TITLE_MENU') {
        soundFX.playMainTheme();
      } else if (gameState === 'PLAYING' && answerStatus === 'IDLE') {
        soundFX.startQuestionMusic(currentQuestionIndex);
      }
    }
  };

  const startNewGame = () => {
    soundFX.stopAll();
    setActiveView('arena');
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setAnswerStatus('IDLE');
    setLifelinesUsed({
      fiftyFifty: false,
      phoneFriend: false,
      askAudience: false,
    });
    setEliminatedOptions([]);
    setFriendModalData(null);
    setAudiencePollData(null);
    setGameState('PLAYING');
  };

  const handleUseFiftyFifty = () => {
    if (lifelinesUsed.fiftyFifty || answerStatus !== 'IDLE' || visibleOptionsCount < 4) return;
    soundFX.playFiftyFifty();

    const wrongIndices = [0, 1, 2, 3].filter((idx) => idx !== currentQuestion.correctIndex);
    const shuffled = [...wrongIndices].sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, 2);

    setEliminatedOptions(toEliminate);
    setLifelinesUsed((prev) => ({ ...prev, fiftyFifty: true }));
  };

  const handleUsePhoneFriend = () => {
    if (lifelinesUsed.phoneFriend || answerStatus !== 'IDLE' || visibleOptionsCount < 4) return;
    soundFX.playPhoneFriend();
    setFriendModalData(currentQuestion.friendAdvice);
    setLifelinesUsed((prev) => ({ ...prev, phoneFriend: true }));
  };

  const handleUseAskAudience = () => {
    if (lifelinesUsed.askAudience || answerStatus !== 'IDLE' || visibleOptionsCount < 4) return;
    soundFX.playAskAudience();

    const correctIdx = currentQuestion.correctIndex;
    const poll = [0, 0, 0, 0];

    const correctPercentage =
      currentQuestion.stage === 1 ? 78 : currentQuestion.stage === 2 ? 66 : 56;
    poll[correctIdx] = correctPercentage;

    let remaining = 100 - correctPercentage;
    const availableWrong = [0, 1, 2, 3].filter(
      (i) => i !== correctIdx && !eliminatedOptions.includes(i)
    );

    availableWrong.forEach((wrongIdx, idx) => {
      if (idx === availableWrong.length - 1) {
        poll[wrongIdx] = remaining;
      } else {
        const share = Math.floor(remaining / (availableWrong.length - idx));
        poll[wrongIdx] = share;
        remaining -= share;
      }
    });

    setAudiencePollData(poll);
    setLifelinesUsed((prev) => ({ ...prev, askAudience: true }));
  };

  const handleSelectAnswer = (optionIdx: number) => {
    if (
      answerStatus !== 'IDLE' ||
      eliminatedOptions.includes(optionIdx) ||
      visibleOptionsCount <= optionIdx
    ) {
      return;
    }

    setSelectedOption(optionIdx);
    setAnswerStatus('LOCKED');
    soundFX.playLockAnswer();

    setTimeout(() => {
      const isCorrect = optionIdx === currentQuestion.correctIndex;
      if (isCorrect) {
        setAnswerStatus('CORRECT');
        if (currentQuestionIndex === QUESTIONS_BANK.length - 1) {
          soundFX.playMillionVictory();
        } else {
          soundFX.playCorrect();
        }
      } else {
        setAnswerStatus('WRONG');
        soundFX.playWrong();
        setTimeout(() => {
          setGameState('GAME_OVER');
        }, 2800);
      }
    }, 2200);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 >= QUESTIONS_BANK.length) {
      setGameState('VICTORY');
      return;
    }

    const nextIdx = currentQuestionIndex + 1;
    const currentStage = QUESTIONS_BANK[currentQuestionIndex].stage;
    const nextStage = QUESTIONS_BANK[nextIdx].stage;

    setCurrentQuestionIndex(nextIdx);
    setSelectedOption(null);
    setAnswerStatus('IDLE');
    setEliminatedOptions([]);
    setFriendModalData(null);
    setAudiencePollData(null);

    if (nextStage !== currentStage) {
      soundFX.stopBackgroundMusic();
      soundFX.playLetsPlay();
      setGameState('STAGE_TRANSITION');
    }
  };

  const handleWalkAway = () => {
    if (answerStatus !== 'IDLE' || currentQuestionIndex === 0) return;
    soundFX.stopBackgroundMusic();
    soundFX.playCorrect();
    setGameState('WALKED_AWAY');
  };

  const renderHexOption = (idx: number) => {
    const isRevealed = visibleOptionsCount > idx;
    const isEliminated = eliminatedOptions.includes(idx);
    const isSelected = selectedOption === idx;
    const isCorrectOption = idx === currentQuestion.correctIndex;

    let wrapStateClass = '';
    if (!isRevealed || isEliminated || answerStatus !== 'IDLE') {
      wrapStateClass += ' disabled-wrap';
    }
    if (answerStatus === 'LOCKED' && isSelected) {
      wrapStateClass += ' locked-wrap';
    } else if (answerStatus === 'CORRECT') {
      if (isCorrectOption) {
        wrapStateClass += ' correct-wrap animate-correct-flash';
      }
    } else if (answerStatus === 'WRONG') {
      if (isSelected) {
        wrapStateClass += ' wrong-wrap';
      } else if (isCorrectOption) {
        wrapStateClass += ' correct-wrap animate-correct-flash';
      }
    }

    return (
      <div
        key={idx}
        className={`wwtbam-option-wrap flex-1 min-w-0 ${wrapStateClass} ${
          isEliminated ? 'opacity-40' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => handleSelectAnswer(idx)}
          disabled={answerStatus !== 'IDLE' || isEliminated || !isRevealed}
          className="wwtbam-option-plate px-6 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3 text-right cursor-pointer disabled:cursor-default min-h-[58px] sm:min-h-[64px]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`text-xs sm:text-sm shrink-0 ${
                answerStatus === 'LOCKED' && isSelected ? 'text-white' : 'text-amber-400'
              }`}
            >
              ◆
            </span>
            <span
              className={`font-black text-base sm:text-lg shrink-0 ${
                answerStatus === 'LOCKED' && isSelected
                  ? 'text-slate-950'
                  : answerStatus !== 'IDLE' && (isCorrectOption || isSelected)
                  ? 'text-white'
                  : 'text-amber-300'
              }`}
            >
              {OPTION_LETTERS[idx]}:
            </span>
            <span
              className={`text-sm sm:text-base font-bold leading-snug transition-opacity duration-200 ${
                isRevealed && !isEliminated ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {currentQuestion.options[idx]}
            </span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020510] text-slate-100 relative overflow-x-hidden">
      {/* Studio Spotlight Backdrop */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 22%, rgba(30, 64, 175, 0.34) 0%, rgba(10, 20, 48, 0.8) 52%, rgba(2, 5, 16, 0.98) 100%)',
        }}
      />

      {/* Top Bar Contract: 3 Clean Zones */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 lg:px-10 py-3.5 border-b border-blue-400/20 bg-[#020510]/90 backdrop-blur-md">
        <a
          href="#arena"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('arena');
          }}
          className="text-lg md:text-xl font-extrabold tracking-tight text-amber-300 whitespace-nowrap shrink-0"
        >
          من سيربح المليون
        </a>

        <nav className="flex items-center gap-7 text-sm font-semibold text-slate-300">
          <button
            onClick={() => setActiveView('arena')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 cursor-pointer ${
              activeView === 'arena' ? 'text-amber-300 border-amber-400' : 'border-transparent'
            }`}
          >
            المسابقة
          </button>
          <button
            onClick={() => setActiveView('bank')}
            className={`hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 cursor-pointer ${
              activeView === 'bank' ? 'text-amber-300 border-amber-400' : 'border-transparent'
            }`}
          >
            بنك الأسئلة
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="p-2 rounded-lg bg-[#0d2254] hover:bg-[#153175] border border-blue-400/40 text-amber-300 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={startNewGame}
            className="px-4 py-2 text-xs md:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {gameState === 'TITLE_MENU' ? 'ابدأ اللعب' : 'إعادة المحاولة'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-5 md:py-7 flex flex-col">
        {activeView === 'arena' && (
          <>
            {/* STATE 1: CLEAN STUDIO TITLE SCREEN */}
            {gameState === 'TITLE_MENU' && (
              <div className="max-w-3xl w-full mx-auto my-auto bg-[radial-gradient(circle_at_50%_30%,rgba(29,78,216,0.38)_0%,rgba(7,18,46,0.95)_70%)] border border-blue-400/35 rounded-3xl p-8 sm:p-14 flex flex-col items-center text-center shadow-2xl">
                {/* Iconic Studio Emblem */}
                <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full border-4 border-amber-400 bg-[radial-gradient(circle,#1d4ed8_0%,#071330_72%,#020617_100%)] shadow-[0_0_70px_rgba(37,99,235,0.8),inset_0_0_30px_rgba(251,191,36,0.4)] flex flex-col items-center justify-center p-6 mb-8">
                  <div className="text-2xl sm:text-3xl font-black text-amber-300 leading-tight mb-2">
                    من سيربح المليون
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white">
                    أنظمة التشغيل
                  </div>
                </div>

                <button
                  onClick={startNewGame}
                  className="flex items-center gap-3 px-10 py-4 bg-gradient-to-l from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-lg rounded-xl shadow-xl transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>ابدأ المسابقة</span>
                </button>
              </div>
            )}

            {/* STATE 2: STAGE TRANSITION */}
            {gameState === 'STAGE_TRANSITION' && (
              <div className="max-w-2xl w-full mx-auto my-auto bg-[#07122e]/95 border-2 border-amber-400 rounded-2xl p-8 sm:p-12 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center mx-auto mb-5">
                  <ShieldCheck className="w-9 h-9 text-amber-300" />
                </div>

                <div className="text-sm font-bold text-emerald-400 mb-2">
                  الرصيد المضمون: {safeHavenPrize}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white mb-8">
                  {STAGE_INFO[currentQuestion.stage].title}
                </h2>

                <button
                  onClick={() => setGameState('PLAYING')}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>السؤال {currentQuestionIndex + 1}</span>
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* STATE 3: AUTHENTIC TV SHOW GAMEPLAY LAYOUT */}
            {gameState === 'PLAYING' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
                {/* Main TV Broadcast Stage (9 Columns) */}
                <div className="lg:col-span-9 bg-[radial-gradient(circle_at_50%_32%,rgba(29,78,216,0.34)_0%,rgba(6,15,38,0.94)_68%,#030817_100%)] border border-blue-400/30 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl relative py-5">
                  {/* Top Bar Inside Stage */}
                  <div className="px-6 flex flex-wrap items-center justify-between gap-3 z-10">
                    <div className="text-xs sm:text-sm font-bold text-amber-300">
                      {currentQuestion.stageTitle}
                    </div>

                    {currentQuestionIndex > 0 && answerStatus === 'IDLE' && (
                      <button
                        onClick={handleWalkAway}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-400/40 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>انسحاب ({earnedPrize})</span>
                      </button>
                    )}
                  </div>

                  {/* Center Studio Stage: Emblem + Active Lifeline Overlays + Next Question Prompt */}
                  <div className="my-4 px-6 flex flex-col items-center justify-center min-h-[210px] z-10">
                    {!friendModalData && !audiencePollData && answerStatus !== 'CORRECT' && (
                      <div className="flex flex-col items-center text-center">
                        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-amber-400/90 bg-[radial-gradient(circle,#1e40af_0%,#091536_70%,#020617_100%)] shadow-[0_0_55px_rgba(37,99,235,0.75),inset_0_0_25px_rgba(251,191,36,0.35)] flex flex-col items-center justify-center p-4">
                          <div className="text-sm font-bold text-blue-200">من سيربح المليون</div>
                          <div className="text-xl sm:text-2xl font-mono-num font-black text-amber-300 my-1">
                            {currentPrizeTier.amount}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Active Lifeline Overlay 1: Phone a Friend */}
                    {friendModalData && answerStatus !== 'CORRECT' && (
                      <div className="w-full max-w-2xl bg-[#071538]/95 border-2 border-amber-400 rounded-2xl p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm sm:text-base">
                            <PhoneCall className="w-4 h-4" />
                            <span>{friendModalData.name}</span>
                          </div>
                          <span className="text-xs font-mono-num text-emerald-300 font-bold">
                            {friendModalData.confidence}%
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-white leading-relaxed">
                          &ldquo;{friendModalData.message}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Active Lifeline Overlay 2: Audience Poll Chart */}
                    {audiencePollData && answerStatus !== 'CORRECT' && (
                      <div className="w-full max-w-xl bg-[#071538]/95 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
                            <Users className="w-4 h-4" />
                            <span>رأي الجمهور</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 items-end h-32 pt-3 px-4 bg-[#040c24] rounded-xl border border-blue-900/60">
                          {audiencePollData.map((pct, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end">
                              <span className="text-xs font-mono-num font-bold text-amber-300">
                                {pct}%
                              </span>
                              <div className="w-full max-w-[42px] bg-slate-900 rounded-t h-16 flex items-end overflow-hidden border border-blue-500/30">
                                <div
                                  className="w-full bg-gradient-to-t from-blue-600 via-amber-500 to-amber-300 rounded-t transition-all duration-300"
                                  style={{ height: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs font-black text-amber-300 pb-1">
                                {OPTION_LETTERS[idx]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Correct Answer Next Question Action */}
                    {answerStatus === 'CORRECT' && (
                      <div className="w-full max-w-xl bg-emerald-950/90 border-2 border-emerald-400 rounded-2xl p-5 shadow-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-emerald-300 font-black text-lg">
                          <CheckCircle2 className="w-6 h-6 shrink-0" />
                          <span>إجابة صحيحة — {currentPrizeTier.amount}</span>
                        </div>

                        <button
                          onClick={handleNextQuestion}
                          className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {currentQuestionIndex + 1 === QUESTIONS_BANK.length
                            ? 'استلام المليون'
                            : 'السؤال التالي'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ==================== LOWER-THIRD AUTHENTIC TV QUESTION & OPTIONS ==================== */}
                  <div className="w-full space-y-3 sm:space-y-3.5 z-10">
                    {/* Full-Width Question Plate with Horizontal Connecting Lines */}
                    <div className="flex items-center w-full">
                      <div className="wwtbam-line w-4 sm:w-10 shrink-0" />
                      <div className="wwtbam-question-border-wrap flex-1">
                        <div className="wwtbam-question-plate px-8 sm:px-12 py-5 sm:py-6 min-h-[84px] sm:min-h-[96px] flex items-center justify-center text-center">
                          <p
                            className="text-lg sm:text-xl md:text-2xl font-extrabold text-white leading-relaxed"
                            style={{ textWrap: 'balance' }}
                          >
                            {currentQuestion.question}
                          </p>
                        </div>
                      </div>
                      <div className="wwtbam-line w-4 sm:w-10 shrink-0" />
                    </div>

                    {/* Row 1 of Hexagonal Options: أ and ب */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center w-full gap-2.5 md:gap-0">
                      <div className="hidden md:block wwtbam-line w-4 sm:w-10 shrink-0" />
                      {renderHexOption(0)}
                      <div className="hidden md:block wwtbam-line w-4 sm:w-8 shrink-0" />
                      {renderHexOption(1)}
                      <div className="hidden md:block wwtbam-line w-4 sm:w-10 shrink-0" />
                    </div>

                    {/* Row 2 of Hexagonal Options: ج and د */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center w-full gap-2.5 md:gap-0">
                      <div className="hidden md:block wwtbam-line w-4 sm:w-10 shrink-0" />
                      {renderHexOption(2)}
                      <div className="hidden md:block wwtbam-line w-4 sm:w-8 shrink-0" />
                      {renderHexOption(3)}
                      <div className="hidden md:block wwtbam-line w-4 sm:w-10 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Right Sidebar: Authentic Oval Lifelines + 15-Rung Millionaire Money Tree */}
                <aside className="lg:col-span-3 bg-[#050d24]/95 border border-blue-400/35 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xl">
                  <div>
                    <div className="grid grid-cols-3 gap-2 mb-4 pb-3 border-b border-blue-900/60">
                      <button
                        onClick={handleUseFiftyFifty}
                        disabled={
                          lifelinesUsed.fiftyFifty ||
                          answerStatus !== 'IDLE' ||
                          visibleOptionsCount < 4
                        }
                        title="50:50"
                        className={`relative h-12 rounded-[50%] border-2 flex items-center justify-center font-mono-num font-black text-xs sm:text-sm transition-transform cursor-pointer ${
                          lifelinesUsed.fiftyFifty
                            ? 'border-slate-700 bg-slate-900/70 text-slate-500 cursor-not-allowed'
                            : 'border-amber-400 bg-[radial-gradient(circle,#1e40af_0%,#071330_85%)] text-amber-300 hover:scale-105 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                        }`}
                      >
                        <span>50:50</span>
                        {lifelinesUsed.fiftyFifty && (
                          <span className="absolute inset-0 flex items-center justify-center text-rose-500 text-2xl font-black pointer-events-none">
                            ✕
                          </span>
                        )}
                      </button>

                      <button
                        onClick={handleUsePhoneFriend}
                        disabled={
                          lifelinesUsed.phoneFriend ||
                          answerStatus !== 'IDLE' ||
                          visibleOptionsCount < 4
                        }
                        title="اتصال بصديق"
                        className={`relative h-12 rounded-[50%] border-2 flex items-center justify-center transition-transform cursor-pointer ${
                          lifelinesUsed.phoneFriend
                            ? 'border-slate-700 bg-slate-900/70 text-slate-500 cursor-not-allowed'
                            : 'border-amber-400 bg-[radial-gradient(circle,#1e40af_0%,#071330_85%)] text-amber-300 hover:scale-105 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                        }`}
                      >
                        <PhoneCall className="w-5 h-5" />
                        {lifelinesUsed.phoneFriend && (
                          <span className="absolute inset-0 flex items-center justify-center text-rose-500 text-2xl font-black pointer-events-none">
                            ✕
                          </span>
                        )}
                      </button>

                      <button
                        onClick={handleUseAskAudience}
                        disabled={
                          lifelinesUsed.askAudience ||
                          answerStatus !== 'IDLE' ||
                          visibleOptionsCount < 4
                        }
                        title="رأي الجمهور"
                        className={`relative h-12 rounded-[50%] border-2 flex items-center justify-center transition-transform cursor-pointer ${
                          lifelinesUsed.askAudience
                            ? 'border-slate-700 bg-slate-900/70 text-slate-500 cursor-not-allowed'
                            : 'border-amber-400 bg-[radial-gradient(circle,#1e40af_0%,#071330_85%)] text-amber-300 hover:scale-105 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                        }`}
                      >
                        <Users className="w-5 h-5" />
                        {lifelinesUsed.askAudience && (
                          <span className="absolute inset-0 flex items-center justify-center text-rose-500 text-2xl font-black pointer-events-none">
                            ✕
                          </span>
                        )}
                      </button>
                    </div>

                    {/* 15-Level Classic Millionaire Money Tree */}
                    <div className="flex flex-col-reverse gap-0.5">
                      {PRIZE_LADDER.map((tier, idx) => {
                        const isCurrent = idx === currentQuestionIndex;
                        const isPassed = idx < currentQuestionIndex;

                        let textClass = 'text-amber-400 font-bold';
                        if (tier.isSafeHaven) {
                          textClass = 'text-white font-black';
                        }
                        if (isCurrent) {
                          textClass =
                            'bg-gradient-to-l from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black rounded-md shadow-md';
                        }

                        return (
                          <div
                            key={tier.level}
                            className={`flex items-center justify-between px-2.5 py-1 text-xs sm:text-[13px] transition-colors ${textClass}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono-num w-5 text-left inline-block ${
                                  isCurrent
                                    ? 'text-slate-950'
                                    : tier.isSafeHaven
                                    ? 'text-white'
                                    : 'text-amber-400'
                                }`}
                              >
                                {tier.level}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  isCurrent
                                    ? 'text-slate-950'
                                    : isPassed
                                    ? 'text-emerald-400'
                                    : 'text-white/70'
                                }`}
                              >
                                ◆
                              </span>
                            </div>
                            <span className="font-mono-num tracking-wider">{tier.amount}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* STATE 4: GAME OVER SCREEN */}
            {gameState === 'GAME_OVER' && (
              <div className="max-w-xl w-full mx-auto my-auto bg-[#07122e]/95 border-2 border-rose-500/70 rounded-2xl p-8 sm:p-10 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center mx-auto mb-5">
                  <XCircle className="w-10 h-10 text-rose-400" />
                </div>

                <h2 className="text-3xl font-black text-white mb-6">
                  انتهت اللعبة
                </h2>

                <div className="mb-8">
                  <div className="text-xs text-slate-400 mb-1">الرصيد المكتسب</div>
                  <div className="text-3xl font-mono-num font-black text-amber-300">
                    {safeHavenPrize}
                  </div>
                </div>

                <button
                  onClick={startNewGame}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            )}

            {/* STATE 5: WALKED AWAY SCREEN */}
            {gameState === 'WALKED_AWAY' && (
              <div className="max-w-xl w-full mx-auto my-auto bg-[#07122e]/95 border-2 border-amber-400 rounded-2xl p-8 sm:p-10 text-center shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center mx-auto mb-5">
                  <Award className="w-10 h-10 text-amber-300" />
                </div>

                <h2 className="text-3xl font-black text-white mb-6">
                  الرصيد النهائي
                </h2>

                <div className="mb-8 p-6 bg-[#040c21] border border-amber-500/40 rounded-xl">
                  <div className="text-4xl font-mono-num font-black text-amber-300">
                    {earnedPrize}
                  </div>
                </div>

                <button
                  onClick={startNewGame}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            )}

            {/* STATE 6: MILLION VICTORY SCREEN */}
            {gameState === 'VICTORY' && (
              <div className="max-w-2xl w-full mx-auto my-auto bg-gradient-to-b from-[#0f2557] to-[#050d24] border-2 border-amber-400 rounded-2xl p-8 sm:p-12 text-center shadow-2xl">
                <div className="w-20 h-20 rounded-2xl bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-11 h-11 text-amber-300" />
                </div>

                <h2 className="text-3xl sm:text-5xl font-black text-amber-300 mb-8">
                  مبروك المليون! (1,000,000)
                </h2>

                <button
                  onClick={startNewGame}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>لعب مرة أخرى</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ==================== VIEW 2: QUESTION BANK (ANSWERS HIDDEN) ==================== */}
        {activeView === 'bank' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 bg-[#07122e]/90 border border-blue-400/30 rounded-2xl p-5">
              <h1 className="text-xl font-black text-white">بنك الأسئلة</h1>

              <div className="flex items-center gap-1.5 p-1.5 bg-[#040a1c] border border-slate-800 rounded-xl">
                {[1, 2, 3].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedBankStage(st as 1 | 2 | 3)}
                    className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedBankStage === st
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    المرحلة {st === 1 ? 'الأولى' : st === 2 ? 'الثانية' : 'الثالثة'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {QUESTIONS_BANK.filter((q) => q.stage === selectedBankStage).map((q) => (
                <div
                  key={q.id}
                  className="bg-[#07122e]/90 border border-slate-800 rounded-2xl p-6 space-y-4"
                >
                  <h3 className="text-lg font-bold text-white">
                    {q.id}. {q.question}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border bg-[#040b1e] border-blue-900/50 text-slate-200 text-sm font-semibold flex items-center gap-2"
                      >
                        <span className="text-amber-400 font-black">
                          ◆ {OPTION_LETTERS[i]}:
                        </span>
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
