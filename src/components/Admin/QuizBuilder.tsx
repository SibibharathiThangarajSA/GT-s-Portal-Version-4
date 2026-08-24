import React, { useState } from 'react';
import { Session, Quiz, QuizQuestion } from '../../types';
import { generateAiQuizApi } from '../../services/api';
import { ArrowLeft, Plus, Save, Trash2, HelpCircle, Sparkles, Clock, Award, ChevronUp, ChevronDown } from 'lucide-react';

interface QuizBuilderProps {
  session: Session;
  onSaveQuiz: (quiz: Quiz) => void;
  onBack: () => void;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ session, onSaveQuiz, onBack }) => {
  const existingQuiz = session.quizzes?.[0];
  const [title, setTitle] = useState(existingQuiz?.title || `${session.name} Assessment`);
  const [timeLimit, setTimeLimit] = useState(existingQuiz?.timeLimitMinutes || 15);
  const [passingScore, setPassingScore] = useState<number | ''>(existingQuiz?.passingScorePercent ?? 80);
  const [questions, setQuestions] = useState<QuizQuestion[]>(existingQuiz?.questions || []);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Manual Question state
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<any>('MCQ');
  const [optionsStr, setOptionsStr] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  const handleAddQuestion = () => {
    if (!prompt.trim() || !correctAnswer.trim()) return;
    const opts = optionsStr ? optionsStr.split(',').map(s => s.trim()) : ['True', 'False'];
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      type,
      prompt,
      options: opts,
      correctAnswer,
      explanation,
      points: 10
    };
    setQuestions([...questions, newQ]);
    setPrompt('');
    setOptionsStr('');
    setCorrectAnswer('');
    setExplanation('');
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    try {
      const materialsText = session.studyMaterials?.map(m => m.description).join(' ') || '';
      const res = await generateAiQuizApi(session.name, materialsText, 5);
      const incomingQuestions = res?.questions || res?.quiz?.questions || [];
      if (Array.isArray(incomingQuestions) && incomingQuestions.length > 0) {
        const formatted = incomingQuestions.map((q: any, idx: number) => ({
          id: q.id || `ai-q-${Date.now()}-${idx}`,
          type: q.type || 'MCQ',
          prompt: q.prompt || '',
          options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['True', 'False'],
          correctAnswer: q.correctAnswer || (q.options?.[0] ?? 'True'),
          explanation: q.explanation || '',
          points: Number(q.points) || 10
        }));
        setQuestions([...questions, ...formatted]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = () => {
    const quiz: Quiz = {
      id: existingQuiz?.id || `quiz-${Date.now()}`,
      sessionId: session.id,
      title,
      description: `Assessment quiz for ${session.name}`,
      timeLimitMinutes: Number(timeLimit),
      passingScorePercent: passingScore === '' ? 80 : Number(passingScore),
      questions
    };
    onSaveQuiz(quiz);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Session Manager
      </button>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">
            INTERACTIVE QUIZ BUILDER & BENCHMARKS
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">{session.name}</h2>
          <p className="text-slate-400 text-xs mt-1">Configure questions, passing rules, or generate automatically using Gemini AI</p>
        </div>

        <button
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Quiz
        </button>
      </div>

      {/* Settings Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <label className="text-slate-300 font-semibold">Quiz Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-slate-300 font-semibold">Time Limit (Minutes)</label>
          <input
            type="number"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          {/* <label className="text-slate-300 font-semibold text-xs flex items-center justify-between">
            <span>Passing Score (%)</span>
            <span className="text-[10px] text-slate-400 font-mono">0 - 100% max</span>
          </label> */}
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={passingScore}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setPassingScore('');
                } else {
                  const num = Number(val);
                  if (!isNaN(num)) {
                    setPassingScore(Math.min(100, Math.max(0, num)));
                  }
                }
              }}
              onBlur={() => {
                if (passingScore === '' || isNaN(Number(passingScore))) {
                  setPassingScore(80);
                } else {
                  setPassingScore(Math.min(100, Math.max(0, Number(passingScore))));
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-14 py-2 text-white font-mono font-bold focus:outline-none focus:border-blue-500 shadow-sm"
            />
            <span className="absolute right-8 text-slate-400 font-bold text-xs pointer-events-none">%</span>
            <div className="absolute right-1 flex flex-col border-l border-slate-800 pl-1 pr-1">
              <button
                type="button"
                onClick={() => setPassingScore(prev => Math.min(100, (Number(prev) || 0) + 5))}
                className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors"
                title="Increase (+5%)"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPassingScore(prev => Math.max(0, (Number(prev) || 0) - 5))}
                className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors"
                title="Decrease (-5%)"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Quiz Generator Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Auto-Generate Quiz Questions
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">Let Gemini analyze session study materials and create 4 structured evaluation questions</p>
        </div>

        <button
          onClick={handleAiGenerate}
          disabled={aiGenerating}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
        >
          {aiGenerating ? 'AI Generating Questions...' : '✨ Generate Questions with AI'}
        </button>
      </div>

      {/* Manual Add Question Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
        <h3 className="font-bold text-white text-sm">Add Question Manually</h3>

        <div className="space-y-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Question prompt (What keyword is used to defer LINQ execution?)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="Multiple Select">Multiple Select</option>
              <option value="Code Output">Code Output</option>
              <option value="True / False">True / False</option>
              <option value="Fill in Blank">Fill in Blank</option>
            </select>

            <input
              type="text"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              placeholder="Comma-separated options (yield, static, const, var)..."
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <input
            type="text"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder="Exact Correct Answer string..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
          />

          <input
            type="text"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explanation shown after quiz completion..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={handleAddQuestion}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md"
          >
            Add Question to Quiz
          </button>
        </div>
      </div>

      {/* Current Questions List */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Q{idx + 1}. {q.prompt}</span>
              <button
                onClick={() => setQuestions(questions.filter(item => item.id !== q.id))}
                className="text-rose-400 hover:text-rose-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-400">Options: {q.options?.join(' | ')}</p>
            <p className="text-emerald-400 font-semibold">Correct: {q.correctAnswer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
