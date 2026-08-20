import React, { useState, useEffect } from 'react';
import { Quiz, QuizQuestion } from '../../types';
import { submitQuizApi } from '../../services/api';
import { QuizReview, isUserAnswerCorrect } from './QuizReview';
import { HelpCircle, CheckCircle2, XCircle, Award, RefreshCw, ChevronRight, ArrowLeft, Zap, Sparkles } from 'lucide-react';

interface QuizViewProps {
  quiz: Quiz;
  onBack: () => void;
  onQuizCompleted?: (scorePercent: number) => void;
}

class QuizReviewErrorBoundary extends React.Component<{
  onReset: () => void;
  onGoToCourse: () => void;
  children: React.ReactNode;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('QuizReview render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-3xl mx-auto p-6 rounded-3xl bg-white border border-slate-200 shadow-lg text-center space-y-4">
          <p className="text-sm font-semibold text-rose-600">Something went wrong while loading the quiz review.</p>
          <p className="text-slate-600">Please try again or return to the course.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <button onClick={this.props.onReset} className="px-5 py-2 rounded-xl bg-slate-100 text-slate-900 text-xs font-semibold hover:bg-slate-200">Retry Review</button>
            <button onClick={this.props.onGoToCourse} className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500">Back to Course</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const QuizView: React.FC<QuizViewProps> = ({ quiz, onBack, onQuizCompleted }) => {
  const storageKey = `quiz-review-${quiz.id}`;
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showReviewPage, setShowReviewPage] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.answers && parsed.result) {
          setAnswers(parsed.answers);
          setResult(parsed.result);
          setSubmitted(true);
          setShowReviewPage(parsed.showReviewPage === true);
        }
      }
    } catch (err) {
      console.error('Failed to restore quiz review data:', err);
    }
  }, [storageKey]);

  useEffect(() => {
    if (submitted && result) {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ answers, result, quizId: quiz.id, showReviewPage })
        );
      } catch (err) {
        console.error('Failed to persist quiz review data:', err);
      }
    }
  }, [submitted, result, answers, showReviewPage, quiz.id, storageKey]);

  useEffect(() => {
    if (showReviewPage && submitted && result) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : {};
        sessionStorage.setItem(storageKey, JSON.stringify({ ...parsed, answers, result, quizId: quiz.id, showReviewPage: true }));
      } catch (err) {
        console.error('Failed to update review visibility state:', err);
      }
    }
  }, [showReviewPage, submitted, result, answers, quiz.id, storageKey]);

  const currentQ = quiz.questions[currentQuestionIndex];

  const handleOptionSelect = (qId: string, option: string, isMultiSelect = false) => {
    if (submitted) return;
    if (isMultiSelect) {
      const currentList: string[] = answers[qId] || [];
      if (currentList.includes(option)) {
        setAnswers({ ...answers, [qId]: currentList.filter(o => o !== option) });
      } else {
        setAnswers({ ...answers, [qId]: [...currentList, option] });
      }
    } else {
      setAnswers({ ...answers, [qId]: option });
    }
  };

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    setSubmitting(true);

    const questionsList = Array.isArray(quiz.questions) ? quiz.questions : [];
    const verifiedTotal = questionsList.length;
    const verifiedCorrect = questionsList.filter(q => isUserAnswerCorrect(q, answers[q.id])).length;
    const verifiedPercent = verifiedTotal > 0 ? Math.round((verifiedCorrect / verifiedTotal) * 100) : 0;
    const passingPercent = Number(quiz.passingScorePercent) || 70;

    try {
      const res = await submitQuizApi(quiz.id, answers);
      
      const finalScorePercent = typeof res?.scorePercent === 'number'
        ? res.scorePercent
        : typeof res?.percentage === 'number'
        ? res.percentage
        : verifiedPercent;

      const finalPassed = typeof res?.passed === 'boolean'
        ? res.passed
        : typeof res?.isPassed === 'boolean'
        ? res.isPassed
        : finalScorePercent >= passingPercent;

      const enrichedResult = {
        ...(typeof res === 'object' && res !== null ? res : {}),
        scorePercent: finalScorePercent,
        percentage: finalScorePercent,
        passed: finalPassed,
        isPassed: finalPassed,
        totalQuestions: typeof res?.totalQuestions === 'number' ? res.totalQuestions : verifiedTotal,
        correctCount: typeof res?.correctCount === 'number' ? res.correctCount : (typeof res?.correctAnswers === 'number' ? res.correctAnswers : verifiedCorrect),
      };

      setResult(enrichedResult);
      setSubmitted(true);
      sessionStorage.setItem(storageKey, JSON.stringify({ answers, result: enrichedResult, quizId: quiz.id, showReviewPage: false }));
      if (onQuizCompleted) onQuizCompleted(finalScorePercent);
    } catch (err) {
      console.error('Quiz submission API call error, using local evaluation:', err);
      const localResult = {
        scorePercent: verifiedPercent,
        percentage: verifiedPercent,
        passed: verifiedPercent >= passingPercent,
        isPassed: verifiedPercent >= passingPercent,
        totalQuestions: verifiedTotal,
        correctCount: verifiedCorrect,
        correctAnswers: verifiedCorrect
      };
      setResult(localResult);
      setSubmitted(true);
      sessionStorage.setItem(storageKey, JSON.stringify({ answers, result: localResult, quizId: quiz.id, showReviewPage: false }));
      if (onQuizCompleted) onQuizCompleted(verifiedPercent);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackAttempt = () => {
    if (Object.keys(answers).length > 0 && !submitted) {
      setConfirmingLeave(true);
      return;
    }
    onBack();
  };

  const handleLeaveConfirmed = () => {
    setConfirmingLeave(false);
    onBack();
  };

  const handleRetryQuiz = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSubmitted(false);
    setResult(null);
    setShowReviewPage(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch (err) {
      console.error('Failed to clear quiz retry state:', err);
    }
  };

  const handleCancelLeave = () => {
    setConfirmingLeave(false);
  };

  if (submitted && result) {
    const questionsList = Array.isArray(quiz.questions) ? quiz.questions : [];
    const calculatedTotal = questionsList.length;
    const localCorrectCount = questionsList.filter(q => isUserAnswerCorrect(q, answers[q.id])).length;
    const localPercent = calculatedTotal > 0 ? Math.round((localCorrectCount / calculatedTotal) * 100) : 0;
    const passingThreshold = Number(quiz.passingScorePercent) || 70;

    const rawScore = result.scorePercent ?? result.percentage ?? (result as any).score;
    const scorePercent = typeof rawScore === 'number' && !isNaN(rawScore)
      ? rawScore
      : (typeof rawScore === 'string' && !isNaN(Number(rawScore)) ? Number(rawScore) : localPercent);

    const totalQuestions = typeof result.totalQuestions === 'number' && result.totalQuestions > 0
      ? result.totalQuestions
      : calculatedTotal;

    const correctCount = typeof result.correctCount === 'number'
      ? result.correctCount
      : typeof (result as any).correctAnswers === 'number'
      ? (result as any).correctAnswers
      : (totalQuestions > 0 && typeof scorePercent === 'number' && !isNaN(scorePercent)
          ? Math.round((scorePercent / 100) * totalQuestions)
          : localCorrectCount);

    const passed = typeof result.passed === 'boolean'
      ? result.passed
      : typeof result.isPassed === 'boolean'
      ? result.isPassed
      : scorePercent >= passingThreshold;

    if (showReviewPage) {
      return (
        <QuizReviewErrorBoundary onReset={() => setShowReviewPage(false)} onGoToCourse={onBack}>
          <QuizReview
            quiz={quiz}
            answers={answers}
            onBack={() => setShowReviewPage(false)}
            onRetry={handleRetryQuiz}
            onGoToCourse={onBack}
            scorePercent={scorePercent}
            passed={passed}
          />
        </QuizReviewErrorBoundary>
      );
    }

    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
        <button
          onClick={handleBackAttempt}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/90 hover:bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Quiz Score Summary Card */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 text-2xl font-black shadow-inner ${
            passed
              ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
              : 'bg-rose-50 border-rose-400 text-rose-600'
          }`}>
            {scorePercent}%
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {passed ? '🎉 Quiz Passed Successfully!' : 'Needs Revision — Keep Practicing'}
            </h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              You answered <span className="font-bold text-slate-800">{correctCount}</span> out of <span className="font-bold text-slate-800">{totalQuestions}</span> questions correctly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2 text-xs text-left">
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-slate-500 font-mono uppercase tracking-widest text-[10px] font-bold">Your Score</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{correctCount} <span className="text-base font-bold text-slate-400">/ {totalQuestions}</span></p>
            </div>
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-slate-500 font-mono uppercase tracking-widest text-[10px] font-bold">Percentage</p>
              <p className="mt-2 text-2xl font-black text-blue-600">{scorePercent}%</p>
            </div>
            <div className={`p-5 rounded-2xl border shadow-xs ${
              passed ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
            }`}>
              <p className="text-slate-500 font-mono uppercase tracking-widest text-[10px] font-bold">Status</p>
              <p className={`mt-2 text-2xl font-black ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {passed ? 'Passed' : 'Failed'}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => setShowReviewPage(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md"
            >
              Review Answers
            </button>
            <button
              onClick={onBack}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/30"
            >
              Continue Learning Path
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={handleBackAttempt}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {confirmingLeave && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-rose-600">Leave Quiz?</p>
          <p className="mt-2 text-slate-600">Your current quiz progress will not be saved.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleCancelLeave}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleLeaveConfirmed}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              Leave Quiz
            </button>
          </div>
        </div>
      )}

      {/* Quiz Header Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-widest block">
            INTERACTIVE ASSESSMENT
          </span>
          <h2 className="text-xl font-bold text-slate-900">{quiz.title}</h2>
        </div>

        {/* No timer shown per updated quiz requirements */}
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded font-semibold">{currentQ.type}</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 leading-relaxed">{currentQ.prompt}</h3>

          {currentQ.codeSnippet && (
            <pre className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 overflow-x-auto">
              {currentQ.codeSnippet}
            </pre>
          )}

          {/* Options List */}
          <div className="space-y-3 pt-2">
            {currentQ.options?.map((opt, i) => {
              const isMultiSelect = currentQ.type === 'Multiple Select';
              const selected = isMultiSelect
                ? (answers[currentQ.id] || []).includes(opt)
                : answers[currentQ.id] === opt;

              return (
                <button
                  key={i}
                  onClick={() => handleOptionSelect(currentQ.id, opt, isMultiSelect)}
                  className={`w-full text-left p-4 rounded-2xl border text-xs font-medium transition-all flex items-center justify-between ${
                    selected
                      ? 'bg-blue-50 text-slate-900 border-blue-200 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{opt}</span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      selected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-300'
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs px-4 py-2 rounded-xl border border-slate-200"
            >
              Previous
            </button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md flex items-center gap-1.5"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/20"
              >
                {submitting ? 'Evaluating...' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
