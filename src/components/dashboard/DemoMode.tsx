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
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"></div>
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 pointer-events-auto shadow-xl bg-black/50 backdrop-blur-sm"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-black/50 backdrop-blur-sm pointer-events-auto">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-100 ease-linear shadow-lg shadow-purple-500/50"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Scene counter and title */}
      <div className="absolute top-6 left-6 pointer-events-auto">
        <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 shadow-2xl">
          <div className="text-white/60 text-xs font-mono mb-1">
            {currentSceneIndex + 1} / {demoScenes.length}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            {currentScene.title}
          </h2>
          <p className="text-sm text-white/70">{currentScene.description}</p>
        </div>
      </div>

      {/* Annotations overlay - positioned absolutely over the real UI */}
      <div className="absolute inset-0 pointer-events-none">
        {currentScene.annotations.map((annotation, index) => (
          <div
            key={index}
            className="absolute animate-fade-in pointer-events-none"
            style={{
              ...annotation.position,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${(annotation.delay || 0)}ms`
            }}
          >
            <div
              className={`px-6 py-3 rounded-xl backdrop-blur-md border shadow-2xl pointer-events-auto ${
                annotation.highlight
                  ? 'bg-purple-500/95 border-purple-400 text-white font-semibold text-lg shadow-purple-500/50'
                  : 'bg-black/80 border-white/30 text-white'
              }`}
            >
              {annotation.text}
            </div>
            {/* Arrow pointer */}
            {!annotation.highlight && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-black/80"></div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-4 pointer-events-auto">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentSceneIndex === 0}
          className="bg-black/70 backdrop-blur-md border-white/20 text-white hover:bg-black/80 disabled:opacity-30 shadow-xl"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          className="bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 shadow-xl shadow-purple-500/50"
        >
          {currentSceneIndex === demoScenes.length - 1 ? 'Finish' : 'Next'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
