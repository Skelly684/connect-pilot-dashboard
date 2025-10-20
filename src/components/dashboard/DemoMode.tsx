import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';

interface DemoScene {
  id: string;
  title: string;
  description: string;
  route: string;
  duration: number;
  annotations: Array<{
    text: string;
    position: { top?: string; bottom?: string; left?: string; right?: string };
    highlight?: boolean;
    delay?: number;
  }>;
}

const demoScenes: DemoScene[] = [
  {
    id: 'intro',
    title: 'Welcome to NEXUS',
    description: 'Your AI-powered lead management system',
    route: '/dashboard',
    duration: 4000,
    annotations: [
      {
        text: 'Automate your entire lead workflow with AI',
        position: { top: '45%', left: '50%' },
        highlight: true,
        delay: 500
      }
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description: 'See all your metrics at a glance',
    route: '/dashboard',
    duration: 5000,
    annotations: [
      {
        text: 'Track total leads and conversion rates',
        position: { top: '30%', left: '20%' },
        delay: 300
      },
      {
        text: 'Monitor active campaigns and replies',
        position: { top: '30%', right: '20%' },
        delay: 800
      }
    ]
  },
  {
    id: 'campaigns',
    title: 'Outreach Campaigns',
    description: 'AI-powered email sequences',
    route: '/outreach',
    duration: 7000,
    annotations: [
      {
        text: 'Create multi-step email campaigns',
        position: { top: '20%', left: '30%' },
        delay: 500
      },
      {
        text: 'AI personalizes each message automatically',
        position: { top: '45%', left: '50%' },
        highlight: true,
        delay: 1500
      },
      {
        text: 'Set delivery rules and timing',
        position: { bottom: '25%', right: '20%' },
        delay: 2500
      }
    ]
  },
  {
    id: 'self-leads',
    title: 'Import Leads',
    description: 'Upload CSV files from SearchLeads',
    route: '/self-leads',
    duration: 6000,
    annotations: [
      {
        text: 'Upload CSV files with leads',
        position: { top: '25%', left: '50%' },
        delay: 500
      },
      {
        text: 'View recent imports and exports',
        position: { top: '50%', left: '30%' },
        delay: 1500
      }
    ]
  },
  {
    id: 'all-leads',
    title: 'All Leads',
    description: 'Manage your prospect database',
    route: '/leads',
    duration: 7000,
    annotations: [
      {
        text: 'Filter and search through all leads',
        position: { top: '15%', left: '50%' },
        delay: 500
      },
      {
        text: 'Track status: New → Contacted → Replied',
        position: { top: '35%', right: '25%' },
        delay: 1500
      },
      {
        text: 'See email and call activity for each lead',
        position: { bottom: '20%', left: '30%' },
        delay: 2500
      }
    ]
  },
  {
    id: 'lead-detail',
    title: 'Lead Activity Timeline',
    description: 'Complete interaction history',
    route: '/leads/demo-lead-1',
    duration: 8000,
    annotations: [
      {
        text: 'View full email conversation thread',
        position: { top: '25%', left: '30%' },
        delay: 500
      },
      {
        text: 'See call logs and recordings',
        position: { top: '45%', left: '30%' },
        delay: 1500
      },
      {
        text: 'Add notes and track next steps',
        position: { bottom: '25%', right: '25%' },
        delay: 2500
      }
    ]
  },
  {
    id: 'lead-reply',
    title: 'Lead Replied! 🎉',
    description: 'Instant notifications',
    route: '/leads',
    duration: 7000,
    annotations: [
      {
        text: '🟣 Replied leads glow purple',
        position: { top: '35%', left: '50%' },
        highlight: true,
        delay: 500
      },
      {
        text: 'Email sequence automatically stops',
        position: { top: '50%', left: '25%' },
        delay: 1500
      },
      {
        text: 'Get instant browser notifications',
        position: { bottom: '20%', right: '25%' },
        highlight: true,
        delay: 2500
      }
    ]
  },
  {
    id: 'calendar',
    title: 'Google Calendar Integration',
    description: 'Schedule meetings with leads',
    route: '/calendar',
    duration: 7000,
    annotations: [
      {
        text: 'One-click Google Calendar sync',
        position: { top: '15%', left: '50%' },
        delay: 500
      },
      {
        text: 'Quick-book meetings with AI suggestions',
        position: { top: '40%', right: '20%' },
        highlight: true,
        delay: 1500
      },
      {
        text: 'Automatic lead linking',
        position: { bottom: '25%', left: '25%' },
        delay: 2500
      }
    ]
  },
  {
    id: 'outro',
    title: 'NEXUS: Your Lead Automation Platform',
    description: 'Close more deals, faster.',
    route: '/dashboard',
    duration: 4000,
    annotations: [
      {
        text: 'Automate outreach • Track engagement • Close deals',
        position: { top: '50%', left: '50%' },
        highlight: true,
        delay: 500
      }
    ]
  }
];

interface DemoModeProps {
  onClose: () => void;
}

export const DemoMode: React.FC<DemoModeProps> = ({ onClose }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { setDemoActive, setCurrentDemoStep } = useDemo();

  const currentScene = demoScenes[currentSceneIndex];

  // Navigate to the scene's route when it changes
  useEffect(() => {
    navigate(currentScene.route);
    setCurrentDemoStep(currentSceneIndex);
  }, [currentSceneIndex, currentScene.route, navigate, setCurrentDemoStep]);

  useEffect(() => {
    const duration = currentScene.duration;
    const interval = 50; // Update every 50ms
    const steps = duration / interval;
    let step = 0;

    const progressTimer = setInterval(() => {
      step++;
      setProgress((step / steps) * 100);

      if (step >= steps) {
        if (currentSceneIndex < demoScenes.length - 1) {
          setCurrentSceneIndex(prev => prev + 1);
          setProgress(0);
        } else {
          onClose();
        }
      }
    }, interval);

    return () => clearInterval(progressTimer);
  }, [currentSceneIndex, currentScene.duration, onClose]);

  const handleNext = () => {
    if (currentSceneIndex < demoScenes.length - 1) {
      setCurrentSceneIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleClose = () => {
    setDemoActive(false);
    onClose();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Nearly invisible overlay - just to establish the z-index layer */}
      {/* Close button - top right corner */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="absolute top-20 right-6 z-10 text-white hover:bg-red-500/90 pointer-events-auto shadow-2xl bg-red-500/80 backdrop-blur-sm border-2 border-white/50 hover:scale-110 transition-all duration-300"
        title="Exit Demo"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Thin progress bar at very top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-black/30 pointer-events-none z-[101]">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 transition-all duration-100 ease-linear shadow-lg shadow-purple-500/50"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Compact info badge - top left */}
      <div className="absolute top-20 left-6 pointer-events-auto animate-fade-in">
        <div className="bg-black/85 backdrop-blur-xl border-2 border-purple-500/50 rounded-2xl px-5 py-3 shadow-2xl shadow-purple-500/30">
          <div className="flex items-center gap-4">
            <div className="text-purple-400 text-xs font-mono font-bold">
              {currentSceneIndex + 1}/{demoScenes.length}
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div>
              <h3 className="text-base font-bold text-white mb-0.5 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                {currentScene.title}
              </h3>
              <p className="text-xs text-white/60">{currentScene.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating annotations over the real dashboard */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {currentScene.annotations.map((annotation, index) => (
          <div
            key={index}
            className="absolute animate-fade-in pointer-events-none"
            style={{
              ...annotation.position,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${(annotation.delay || 0)}ms`,
              zIndex: 50
            }}
          >
            <div
              className={`px-5 py-3 rounded-xl backdrop-blur-xl border-2 shadow-2xl pointer-events-none transition-all duration-300 ${
                annotation.highlight
                  ? 'bg-purple-600/95 border-purple-400 text-white font-bold text-base shadow-purple-500/60 animate-pulse'
                  : 'bg-black/90 border-yellow-400/70 text-white font-medium text-sm shadow-yellow-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {!annotation.highlight && (
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                )}
                <span>{annotation.text}</span>
              </div>
            </div>
            {/* Pointing arrow for non-highlighted annotations */}
            {!annotation.highlight && (
              <svg 
                className="absolute -bottom-3 left-1/2 -translate-x-1/2" 
                width="24" 
                height="12" 
                viewBox="0 0 24 12"
              >
                <path 
                  d="M12 12L0 0h24z" 
                  fill="rgba(0,0,0,0.9)"
                  stroke="rgba(250, 204, 21, 0.7)"
                  strokeWidth="2"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Sleek navigation controls at bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 pointer-events-auto animate-fade-in">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentSceneIndex === 0}
          className="bg-black/85 backdrop-blur-xl border-2 border-white/30 text-white hover:bg-black/90 hover:border-white/50 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xl transition-all duration-300 hover:scale-105"
          size="lg"
        >
          Previous
        </Button>
        
        <div className="bg-black/85 backdrop-blur-xl border-2 border-purple-500/50 rounded-xl px-4 py-2 shadow-2xl">
          <div className="text-purple-400 font-mono text-sm font-bold">
            Step {currentSceneIndex + 1} of {demoScenes.length}
          </div>
        </div>
        
        <Button
          onClick={handleNext}
          className="bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white hover:from-purple-500 hover:via-purple-400 hover:to-purple-500 shadow-2xl shadow-purple-500/50 transition-all duration-300 hover:scale-105 font-semibold"
          size="lg"
        >
          {currentSceneIndex === demoScenes.length - 1 ? 'Finish Demo' : 'Next Step'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
