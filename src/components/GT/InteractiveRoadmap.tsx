import React from 'react';
import { RoadmapTopic } from '../../types';
import { Layers, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveRoadmapProps {
  topics: RoadmapTopic[];
  selectedTopicId?: string;
  onSelectTopic: (topicId: string) => void;
}

export const InteractiveRoadmap: React.FC<InteractiveRoadmapProps> = ({
  topics,
  selectedTopicId,
  onSelectTopic
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-md space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Interactive Learning Roadmap</span>
          </h3>
          <p className="text-slate-600 text-xs mt-0.5 font-medium">
            Click any module header to expand or collapse subtopics
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-xs">
          {(topics || []).length} Modules Total
        </span>
      </div>

      {/* Vertical Interactive Tree Flow */}
      <div className="relative py-2 max-w-3xl mx-auto space-y-4">
        {(topics || []).map((topic, index) => {
          const isSelected = topic.id === selectedTopicId;
          const subtopics = topic.subtopics || [];

          return (
            <div key={topic.id} className="relative">
              {/* Module Header Node */}
              <div
                onClick={() => onSelectTopic(topic.id)}
                className={`p-4.5 rounded-2xl border transition-all duration-300 flex items-center justify-between cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-md translate-x-1'
                    : 'bg-white hover:bg-blue-50/40 border-slate-200/90 hover:border-blue-300 shadow-sm'
                }`}
                data-inspect-id="SessionCard"
              >
                <div className="flex items-center gap-4">
                  {/* Module Circle Badge Node */}
                  <div
                    className={`w-9 h-9 rounded-2xl font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white ring-4 ring-blue-600/20 shadow-blue-500/30'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isSelected ? '●' : '○'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-blue-600 uppercase">
                        Module {index + 1}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                      {topic.title}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5 font-medium">
                      {topic.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-semibold text-slate-500 hidden sm:inline">
                    {subtopics.length} Subtopics
                  </span>
                  <motion.div
                    animate={{ rotate: isSelected ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  </motion.div>
                </div>
              </div>

              {/* Dynamic Inline Tree Subtopics Expansion */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 pb-2 pl-6 sm:pl-10 relative space-y-2">
                      {/* Vertical Connector Line from Parent Module */}
                      <div className="absolute left-4 sm:left-7 top-0 bottom-6 w-0.5 bg-blue-300 rounded-full" />

                      {subtopics.map((sub, subIdx) => {
                        const isLast = subIdx === subtopics.length - 1;

                        return (
                          <motion.div
                            key={sub.id || `sub-${subIdx}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: subIdx * 0.05 }}
                            className="relative flex items-start gap-3 group"
                          >
                            {/* Branch Connector Line (├─ or └─) */}
                            <div className="flex items-center h-9 -ml-6 sm:-ml-9 text-blue-400 font-mono text-xs select-none">
                              <span className="font-bold text-blue-500">
                                {isLast ? '└─' : '├─'}
                              </span>
                            </div>

                            {/* Subtopic Card Item */}
                            <div className="flex-1 bg-white hover:bg-blue-50/60 border border-slate-200/90 hover:border-blue-300 rounded-xl p-3.5 shadow-xs transition-all flex items-center justify-between gap-3">
                              <div>
                                <h5 className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition-colors">
                                  {sub.title}
                                </h5>
                                {sub.description && (
                                  <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium">
                                    {sub.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
