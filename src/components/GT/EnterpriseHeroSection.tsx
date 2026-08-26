import React, { useState, useRef, useEffect } from 'react';
import { SITE_VIDEOS } from '../../data/videoAssets';
import { appConfig, AppConfig } from '../../config/appConfig';
import {
  BookOpen,
  Play,
  Pause,
  Clock,
  User as UserIcon,
  Volume2,
  Maximize2,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VideoData {
  id: string;
  title: string;
  badgeTag: string;
  heading: string;
  description: string;
  duration: string;
  presenter: string;
  thumbnailUrl: string;
  sampleVideoUrl: string;
}

const videos: VideoData[] = [
  {
    id: 'leadership',
    title: 'Leadership Insights',
    badgeTag: 'Leadership Insights',
    heading: 'About this video',
    description: 'Discover the lessons, experiences, and leadership perspectives that shaped our graduate trainee journey.',
    duration: '05:23 min',
    presenter: 'Leadership Team',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&auto=format&fit=crop&q=80',
    sampleVideoUrl: SITE_VIDEOS.leadershipInsights
  },
  {
    id: 'overview',
    title: 'Training Overview',
    badgeTag: 'Training Overview',
    heading: 'About this video',
    description: 'Expert-led learning journey covering professional skills, insurance fundamentals, software development, and modern data platforms.',
    duration: '19:38 min',
    presenter: 'L&D Team',
    thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
    sampleVideoUrl: SITE_VIDEOS.finalOverview
  }
];

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

interface EnterpriseHeroSectionProps {
  modulesCount?: number;
  config?: Partial<AppConfig>;
  backgroundImage?: string;
}

export const EnterpriseHeroSection: React.FC<EnterpriseHeroSectionProps> = ({
  modulesCount = 9,
  config,
  backgroundImage
}) => {
  const [activeVideoId, setActiveVideoId] = useState<string>('leadership');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentVideo = videos.find(v => v.id === activeVideoId) || videos[0];

  // Dynamically resolve background image from configuration object (not hardcoded in JSX)
  const heroBackgroundImage =
    backgroundImage ||
    config?.heroCard?.backgroundImage ||
    appConfig.heroCard.backgroundImage;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [activeVideoId]);

  const handleTogglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error(err));
      }
    }
  };

  const handleOpenModal = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setIsVideoModalOpen(true);
  };

  return (
    <div
      className="enterprise-hero-card relative overflow-hidden w-full p-7 sm:p-9 lg:p-10 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(37,99,235,0.12)]"
      style={{
        backgroundImage: `url(${heroBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        borderRadius: '30px',
        border: '1px solid #BFDBFE',
        boxShadow: '0 16px 48px rgba(37, 99, 235, 0.08)',
        color: '#0F172A'
      }}
    >
      {/* Absolute Background Image Element */}
      <img
        src={heroBackgroundImage}
        alt="Knowledge Repository Background"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.includes('knowledge-repository-bg.png')) {
            target.src = '/Assets/Images/knowledge-repository-bg.png';
          }
        }}
      />

      {/* Soothing Light Blue Frosted Gradient Overlay: Eliminates harsh white glare while keeping the background image beautifully visible */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-r from-[#DCEBFC]/94 via-[#E6F1FD]/80 via-35% to-[#D4E6FA]/25 to-85% pointer-events-none"
      />
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-b from-[#E2F0FE]/50 via-transparent to-[#D8EAFD]/25 pointer-events-none"
      />

      {/* Soft ambient blue lighting highlights */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl pointer-events-none z-[1]"
      />
      <div
        className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none z-[1]"
      />

      {/* Hero Top Header Row (Knowledge Repository & Statement in single lines) */}
      <div className="relative z-10 space-y-1.5 mb-6">
        {/* Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E0EEFE]/90 border border-[#BFDBFE] text-[#1D4ED8] text-xs font-semibold select-none w-fit shadow-xs backdrop-blur-md">
          <BookOpen className="w-3.5 h-3.5 text-[#1D4ED8]" />
          <span>Resource Center • {modulesCount} Modules</span>
        </div>

        {/* Main Heading - Single Line */}
        <h1 className="text-[28px] sm:text-[36px] lg:text-[40px] font-extrabold text-[#0F172A] tracking-tight leading-tight font-sans whitespace-nowrap">
          {/* Knowledge Repository */}
          Companion Hub
        </h1>

        {/* Description Statement - Single Line */}
        <p className="text-xs sm:text-sm lg:text-[14.5px] font-medium text-[#475569] leading-normal whitespace-nowrap overflow-hidden text-ellipsis">
          Browse notes, guides, documents, and valuable resources organized to support your Graduate Trainee journey.
        </p>
      </div>

      {/* Hero Content Grid: Left Prominent Video Player (7 Cols) & Right Compact Featured Videos Card (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">

        {/* Left Section: Prominent Featured Video Player (lg:col-span-7) */}
        <div className="lg:col-span-7 flex items-center justify-center">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200/80 shadow-xl shadow-blue-900/12 group transition-all duration-300 hover:scale-[1.005] bg-slate-950">
            {/* HTML5 Video Element */}
            <video
              ref={videoRef}
              key={currentVideo.id}
              src={currentVideo.sampleVideoUrl}
              poster={currentVideo.thumbnailUrl}
              preload="metadata"
              playsInline
              controls
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('gtv-videos-bucket')) {
                  target.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
                  target.play().catch(() => {});
                }
              }}
              className="w-full h-full object-cover"
            />

            {/* Overlay when not playing */}
            {!isPlaying && (
              <div
                onClick={(e) => handleTogglePlay(e)}
                className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-blue-950/20 group-hover:opacity-95 transition-opacity"
              >
                {/* Top Left Floating Tag */}
                <div className="absolute top-3.5 left-3.5 bg-[#2563EB] text-white px-3 py-1 text-xs font-semibold rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-md pointer-events-none">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>{currentVideo.badgeTag}</span>
                </div>

                {/* Center Play Button */}
                <div className="w-[68px] h-[68px] rounded-full bg-white text-[#2563EB] flex items-center justify-center shadow-[0_10px_30px_rgba(15,23,42,0.3)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_14px_40px_rgba(37,99,235,0.4)]">
                  <Play className="w-7 h-7 fill-[#2563EB] text-[#2563EB] translate-x-0.5" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Compact Non-Stretched Featured Videos Card with Glassmorphism (lg:col-span-5) */}
        <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
          <div className="bg-white/65 backdrop-blur-xl rounded-2xl border border-white/80 shadow-[0_16px_40px_rgba(37,99,235,0.08)] p-5 space-y-4 w-full max-w-[420px] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(37,99,235,0.14)] hover:bg-white/75 relative">
            {/* Card Top Title Row */}
            <div className="flex items-center justify-between border-b border-blue-900/10 pb-2.5">
              <h3 className="text-xs font-bold text-[#0F172A] tracking-wider uppercase font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)] inline-block" />
                Featured Videos
              </h3>
              <span className="text-[10.5px] font-mono text-blue-700 bg-blue-600/10 px-2.5 py-0.5 rounded-full font-bold border border-blue-500/20 backdrop-blur-md">
                {videos.length} Videos
              </span>
            </div>

            {/* Segmented Buttons (Stacked/Grid in compact width) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {videos.map((vid) => {
                const isActive = vid.id === activeVideoId;

                return (
                  <button
                    key={vid.id}
                    onClick={() => {
                      setActiveVideoId(vid.id);
                    }}
                    className={`h-[46px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 px-3 transition-all duration-200 select-none cursor-pointer ${isActive
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white shadow-md shadow-blue-600/30 border border-blue-400/40 -translate-y-0.5'
                      : 'bg-white/50 hover:bg-white/80 border border-white/70 text-[#1E293B] backdrop-blur-md hover:-translate-y-0.5 shadow-xs'
                      }`}
                  >
                    <Play className={`w-3.5 h-3.5 ${isActive ? 'text-white fill-white' : 'text-[#2563EB]'}`} />
                    <span className="truncate">{vid.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Video Description with Smooth Fade */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentVideo.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 pt-2 border-t border-blue-900/10"
              >
                <h4 className="text-xs font-bold text-[#0F172A]">
                  {currentVideo.heading}
                </h4>
                <p className="text-xs text-[#334155] leading-relaxed line-clamp-3">
                  {currentVideo.description}
                </p>

                {/* Bottom Metadata Row */}
                <div className="flex items-center gap-2 pt-1 text-[#475569] text-[11px] font-medium font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{currentVideo.duration}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>{currentVideo.presenter}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Light Video Lightbox Modal */}
      <AnimatePresence>
        {isVideoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setIsVideoModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl space-y-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800">
                    {currentVideo.badgeTag}
                  </span>
                </div>
                <button
                  onClick={() => setIsVideoModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Element */}
              <div className="aspect-video w-full bg-black relative">
                <video
                  src={currentVideo.sampleVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
