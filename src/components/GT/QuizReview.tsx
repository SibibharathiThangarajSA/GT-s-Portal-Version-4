import React from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, RefreshCw, Award, Check, X, HelpCircle } from 'lucide-react';
import { Quiz, QuizQuestion } from '../../types';

interface QuizReviewProps {
  quiz: Quiz;
  answers: Record<string, any>;
  onBack: () => void;
  onRetry: () => void;
  onGoToCourse?: () => void;
  scorePercent: number;
  passed: boolean;
}

// Normalizes an answer into string array
const normalizeAnswerArray = (answer: any): string[] => {
  if (Array.isArray(answer)) return answer.map(String).filter(Boolean);
  if (answer === undefined || answer === null || answer === '') return [];
  if (typeof answer === 'string') {
    try {
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      if (typeof parsed === 'string' && parsed.trim() !== '') return [parsed.trim()];
    } catch {
      // not json, use raw
    }
    return [answer.trim()];
  }
  return [String(answer).trim()];
};

// Resolves correct answer text whether stored as string, index, letter, or json
export const resolveCorrectAnswerText = (question: QuizQuestion): string[] => {
  const raw = question.correctAnswer || (question as any).correctAnswerJson || (question as any).CorrectAnswerJson;
  const rawList = normalizeAnswerArray(raw);
  const options = question.options || [];

  if (rawList.length === 0) {
    return ['Not specified'];
  }

  return rawList.map(item => {
    const trimmed = item.trim();
    // Check if it's a numeric index (e.g. "0", "1", "2")
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0 && num < options.length && String(num) === trimmed) {
      return options[num];
    }
    // Check if it's a letter (e.g. "A", "B", "C", "D")
    if (trimmed.length === 1 && /^[a-dA-D]$/.test(trimmed)) {
      const letterIdx = trimmed.toUpperCase().charCodeAt(0) - 65;
      if (letterIdx >= 0 && letterIdx < options.length) {
        return options[letterIdx];
      }
    }
    return trimmed;
  });
};

// Checks whether user's answer matches the question's correct answer
export const isUserAnswerCorrect = (question: QuizQuestion, userAnswer: any): boolean => {
  const userList = normalizeAnswerArray(userAnswer).map(a => a.trim().toLowerCase()).sort();
  const correctResolved = resolveCorrectAnswerText(question).map(a => a.trim().toLowerCase()).sort();
  const rawCorrect = normalizeAnswerArray(question.correctAnswer || (question as any).correctAnswerJson).map(a => a.trim().toLowerCase()).sort();

  if (userList.length === 0) return false;

  // Compare against resolved options
  if (userList.join('|') === correctResolved.join('|')) return true;
  // Compare against raw strings
  if (userList.join('|') === rawCorrect.join('|')) return true;

  // Also check if user selected option matching index
  const options = (question.options || []).map(o => o.trim().toLowerCase());
  const userResolvedFromOptions = userList.map(u => {
    const idx = parseInt(u, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length && String(idx) === u) {
      return options[idx];
    }
    return u;
  }).sort();

  return userResolvedFromOptions.join('|') === correctResolved.join('|');
};

export const getOptionVisualState = (question: QuizQuestion, option: string, userAnswer: any) => {
  const correctList = resolveCorrectAnswerText(question).map(a => a.trim().toLowerCase());
  const userList = normalizeAnswerArray(userAnswer).map(a => a.trim().toLowerCase());
  const optionNorm = option.trim().toLowerCase();

  const isCorrect = correctList.includes(optionNorm);
  const isSelected = userList.includes(optionNorm) || (
    // check if user selected option by index
    userList.some(u => {
      const idx = parseInt(u, 10);
      return !isNaN(idx) && question.options && question.options[idx]?.trim().toLowerCase() === optionNorm;
    })
  );

  if (isSelected && isCorrect) return 'selected-correct';
  if (isSelected && !isCorrect) return 'selected-incorrect';
  if (!isSelected && isCorrect) return 'correct-unselected';
  return 'neutral';
};

export const QuizReview: React.FC<QuizReviewProps> = ({
  quiz,
  answers,
  onBack,
  onRetry,
  onGoToCourse,
  scorePercent,
  passed
}) => {
  const available = quiz && Array.isArray(quiz.questions) && quiz.questions.length > 0;

  if (!available) {
    return (
      <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl text-center">
        <p className="text-base font-bold text-slate-900">Quiz Review Not Available</p>
        <p className="mt-2 text-slate-500 text-xs">Your quiz review could not be loaded.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Count correct answers using robust matching
  const correctCount = quiz.questions.filter(q => isUserAnswerCorrect(q, answers[q.id])).length;
  const calculatedPercent = quiz.questions.length > 0 ? Math.round((correctCount / quiz.questions.length) * 100) : 0;
  const displayScorePercent = (scorePercent !== undefined && scorePercent !== null && !isNaN(Number(scorePercent)) && (Number(scorePercent) === calculatedPercent || correctCount === 0))
    ? Number(scorePercent)
    : calculatedPercent;
  const isPassed = passed !== undefined && passed !== null && typeof passed === 'boolean'
    ? (displayScorePercent === calculatedPercent ? displayScorePercent >= (quiz.passingScorePercent ?? 80) : passed)
    : displayScorePercent >= (quiz.passingScorePercent ?? 80);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn pb-12">
      {/* Top Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/90 hover:bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" /> Back to Score
          </button>
          {onGoToCourse && (
            <button
              onClick={onGoToCourse}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 px-4 py-2.5 rounded-xl border border-blue-200 shadow-xs transition-all hover:-translate-y-0.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Back to Course
            </button>
          )}
        </div>

        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Quiz
        </button>
      </div>

      {/* Glass White Header Summary Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-blue-900/5">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider mb-2 font-mono">
                <Award className="w-3 h-3 text-blue-600" /> {quiz.title || 'Assessment Review'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Review Answers</h1>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              {quiz.questions.length} Questions Reviewed
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 sm:p-5 shadow-xs backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Final Score</p>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
                {correctCount} <span className="text-lg font-bold text-slate-400">/ {quiz.questions.length}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 sm:p-5 shadow-xs backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Percentage</p>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-blue-600">
                {displayScorePercent}%
              </p>
            </div>

            <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs backdrop-blur ${
              isPassed ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Status</p>
              <p className={`mt-2 text-2xl sm:text-3xl font-black ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPassed ? 'Passed' : 'Failed'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Glass White Question Cards List */}
      <div className="space-y-6">
        {quiz.questions.map((question, index) => {
          const userAnswer = answers[question.id];
          const isCorrect = isUserAnswerCorrect(question, userAnswer);
          const selectedAnswers = normalizeAnswerArray(userAnswer);
          const correctAnswers = resolveCorrectAnswerText(question);

          return (
            <div
              key={question.id || index}
              className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-lg shadow-slate-200/50 transition-all hover:shadow-xl space-y-6"
            >
              {/* Question Header & Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold font-mono">
                    Question {index + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    {question.type || 'MCQ'}
                  </span>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase border ${
                    isCorrect
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>Correct</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                      <span>Incorrect</span>
                    </>
                  )}
                </div>
              </div>

              {/* Question Prompt */}
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {question.prompt}
              </h2>

              {/* Code Snippet if present */}
              {question.codeSnippet && (
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
                  <pre>{question.codeSnippet}</pre>
                </div>
              )}

              {/* Options List */}
              <div className="grid grid-cols-1 gap-2.5">
                {(question.options || []).map((option, optIdx) => {
                  const state = getOptionVisualState(question, option, userAnswer);
                  const optionLabel = String.fromCharCode(65 + optIdx);

                  return (
                    <div
                      key={option || optIdx}
                      className={`rounded-2xl p-4 border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${
                        state === 'selected-correct'
                          ? 'border-emerald-400 bg-emerald-50/90 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                          : state === 'selected-incorrect'
                          ? 'border-rose-400 bg-rose-50/90 text-rose-950 shadow-xs ring-1 ring-rose-400'
                          : state === 'correct-unselected'
                          ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 border-dashed'
                          : 'border-slate-200/80 bg-slate-50/60 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono ${
                          state === 'selected-correct'
                            ? 'bg-emerald-600 text-white'
                            : state === 'selected-incorrect'
                            ? 'bg-rose-600 text-white'
                            : state === 'correct-unselected'
                            ? 'bg-emerald-200 text-emerald-800'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {optionLabel}
                        </span>
                        <span className="leading-snug">{option}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-xs">
                        {state === 'selected-correct' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Your Answer (Correct)
                          </span>
                        )}
                        {state === 'selected-incorrect' && (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100/80 px-2.5 py-1 rounded-lg">
                            <XCircle className="w-4 h-4 text-rose-600" /> Your Answer (Incorrect)
                          </span>
                        )}
                        {state === 'correct-unselected' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Correct Answer
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Side-by-Side: Your Answer vs Correct Answer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Your Answer Box */}
                <div className={`rounded-2xl border p-4 backdrop-blur ${
                  isCorrect
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-rose-200 bg-rose-50/50'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Your Answer</p>
                  <p className={`mt-1.5 text-sm font-bold ${
                    isCorrect ? 'text-emerald-900' : 'text-rose-900'
                  }`}>
                    {selectedAnswers.length > 0 ? selectedAnswers.join(', ') : 'No answer selected'}
                  </p>
                </div>

                {/* Correct Answer Box */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 backdrop-blur">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 font-mono">Correct Answer</p>
                  <p className="mt-1.5 text-sm font-extrabold text-emerald-950">
                    {correctAnswers.join(', ')}
                  </p>
                </div>
              </div>

              {/* Explanation note if available */}
              {question.explanation && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-950">Explanation: </span>
                    <span>{question.explanation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

