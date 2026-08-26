import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Gauge,
  Check,
  Sparkles
} from 'lucide-react';

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  className?: string;
  title?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 4];

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  autoPlay = false,
  className = '',
  title = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  // Hover timestamp tooltip states
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [isHoveringScrub, setIsHoveringScrub] = useState(false);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const totalSecs = Math.floor(timeInSeconds);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      setIsPlaying(true);
      videoRef.current.play().catch(err => {
        console.warn("Video playback blocked or failed:", err);
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Skip time (+10s or -10s)
  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  // Mute toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  // Change Playback Speed (0.5x, 1x, 2x, 4x, etc.)
  const changeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setIsSpeedMenuOpen(false);
  };

  // Progress Bar Hover Event (Calculate hover time & cursor position)
  const handleScrubMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = offsetX / rect.width;
    const calculatedTime = percentage * duration;

    setHoverTime(calculatedTime);
    setHoverPosition(offsetX);
  };

  // Click on progress bar to seek
  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = offsetX / rect.width;
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  // Auto hide controls on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isSpeedMenuOpen && !isHoveringScrub) {
          setShowControls(false);
        }
      }, 2500);
    }
  };

  // Keep speed updated when video source changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [src, playbackRate]);

  // Sync native video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Handle Video Error Fallback if local asset is missing
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const target = e.currentTarget;
    if (!target.src.includes('gtv-videos-bucket')) {
      console.warn("Primary video failed to load, switching to fallback sample video.");
      target.src = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      target.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
        setIsSpeedMenuOpen(false);
      }}
      className={`relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl select-none group border border-slate-800 ${className}`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        onClick={togglePlay}
        onError={handleVideoError}
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (!videoRef.current.paused && !isPlaying) setIsPlaying(true);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Large Central Play Button Overlay when paused */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-all duration-300 z-10"
        >
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl shadow-blue-600/50 hover:scale-110 hover:bg-blue-600 transition-all duration-300 border-2 border-white/20 pl-1 pointer-events-none"
          >
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white" />
          </div>
        </div>
      )}

      {/* Video Title Header Overlay */}
      {title && (
        <div
          className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 z-20 pointer-events-none ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h4 className="text-sm font-bold text-white tracking-wide drop-shadow-md truncate">{title}</h4>
        </div>
      )}

      {/* Bottom Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-all duration-300 z-30 ${
          showControls || !isPlaying || isSpeedMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* =================================================== */}
        {/* PROGRESS / SCRUB BAR WITH HOVER TIMESTAMP TOOLTIP */}
        {/* =================================================== */}
        <div
          ref={progressBarRef}
          onMouseEnter={() => setIsHoveringScrub(true)}
          onMouseLeave={() => {
            setIsHoveringScrub(false);
            setHoverTime(null);
            setHoverPosition(null);
          }}
          onMouseMove={handleScrubMouseMove}
          onClick={handleScrubClick}
          className="relative w-full h-3 mb-3 flex items-center cursor-pointer group/scrub py-1"
        >
          {/* Track Background */}
          <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden transition-all group-hover/scrub:h-2.5 relative">
            {/* Played Progress Bar */}
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full relative"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Hover Progress Highlight Line */}
          {isHoveringScrub && hoverPosition !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2 bg-white/40 rounded-full pointer-events-none"
              style={{
                left: 0,
                width: `${hoverPosition}px`
              }}
            />
          )}

          {/* Scrub Handle Thumb Indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-blue-600 scale-0 group-hover/scrub:scale-100 transition-transform pointer-events-none -ml-2"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />

          {/* Hover Time Tooltip Display (Shows exact hover timestamp mm:ss) */}
          {isHoveringScrub && hoverTime !== null && hoverPosition !== null && (
            <div
              className="absolute bottom-full mb-2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/95 text-white border border-slate-700/80 text-[11px] font-mono font-bold shadow-xl pointer-events-none flex items-center gap-1 backdrop-blur-md z-40 whitespace-nowrap"
              style={{
                left: `${Math.max(24, Math.min(hoverPosition, (progressBarRef.current?.getBoundingClientRect().width || 200) - 24))}px`,
              }}
            >
              <span className="text-teal-400">⏱</span>
              <span>{formatTime(hoverTime)}</span>
            </div>
          )}
        </div>

        {/* =================================================== */}
        {/* CONTROL BUTTONS BAR */}
        {/* =================================================== */}
        <div className="flex items-center justify-between gap-2 text-white">
          
          {/* Left Controls: Play/Pause, Rewind, Forward, Time Display */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-1.5 sm:p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => skipTime(-10)}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer hidden sm:flex"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => skipTime(10)}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer hidden sm:flex"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 sm:w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-500 opacity-70 group-hover/vol:opacity-100 transition-opacity"
              />
            </div>

            {/* Current Time / Duration Display */}
            <div className="text-[11px] sm:text-xs font-mono font-medium text-slate-300 ml-1">
              <span className="text-white font-bold">{formatTime(currentTime)}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Playback Speed Selector & Fullscreen */}
          <div className="flex items-center gap-2 relative">
            
            {/* Playback Speed Menu Button (.5x, 1x, 2x, 4x) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1 border ${
                  playbackRate !== 1
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                    : 'bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 border-white/10'
                }`}
                title="Playback Speed"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>{playbackRate}x</span>
              </button>

              {/* Speed Dropdown Menu Overlay */}
              {isSpeedMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-900/95 border border-slate-700/90 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>Speed</span>
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto no-scrollbar">
                    {SPEED_OPTIONS.map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => changeSpeed(speed)}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between transition-colors ${
                          playbackRate === speed
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{speed === 1 ? '1x (Normal)' : `${speed}x`}</span>
                        {playbackRate === speed && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
