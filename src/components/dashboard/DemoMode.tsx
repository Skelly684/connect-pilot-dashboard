import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoScene {
  id: string;
  title: string;
  description: string;
  image: string;
  duration: number;
  annotations: Array<{
    text: string;
    position: { top?: string; bottom?: string; left?: string; right?: string };
    highlight?: boolean;
  }>;
}

const demoScenes: DemoScene[] = [
  {
    id: 'intro',
    title: 'Welcome to NEXUS',
    description: 'Your AI-powered lead management system',
    image: '/demo/intro.jpg',
    duration: 3000,
    annotations: [
      {
        text: 'Automate your entire lead workflow',
        position: { top: '50%', left: '50%' },
        highlight: true
      }
    ]
  },
  {
    id: 'create-campaign',
    title: 'Create Outreach Campaign',
    description: 'Set up automated email sequences',
    image: '/demo/campaign.jpg',
    duration: 8000,
    annotations: [
      {
        text: '1. Click "New Campaign" to get started',
        position: { top: '15%', right: '10%' }
      },
      {
        text: '2. Choose your messaging strategy',
        position: { top: '35%', left: '10%' }
      },
      {
        text: '3. Set delivery rules and timing',
        position: { top: '55%', right: '15%' }
      },
      {
        text: '4. AI automatically personalizes each email',
        position: { bottom: '15%', left: '50%' },
        highlight: true
      }
    ]
  },
  {
    id: 'search-leads',
    title: 'Search for Leads',
    description: 'Find your perfect prospects',
    image: '/demo/search.jpg',
    duration: 7000,
    annotations: [
      {
        text: 'Enter search criteria (industry, location, size)',
        position: { top: '20%', left: '10%' }
      },
      {
        text: 'SearchLeads integration finds qualified prospects',
        position: { top: '40%', right: '10%' },
        highlight: true
      },
      {
        text: 'Export completes in minutes',
        position: { bottom: '20%', left: '50%' }
      }
    ]
  },
  {
    id: 'review-leads',
    title: 'Review & Filter Leads',
    description: 'Accept or reject prospects',
    image: '/demo/review.jpg',
    duration: 8000,
    annotations: [
      {
        text: 'Review new leads in the queue',
        position: { top: '15%', left: '10%' }
      },
      {
        text: 'Accept high-quality prospects',
        position: { top: '40%', right: '15%' }
      },
      {
        text: 'Reject unqualified leads',
        position: { bottom: '30%', left: '10%' }
      },
      {
        text: 'Accepted leads automatically enter your campaign',
        position: { bottom: '15%', left: '50%' },
        highlight: true
      }
    ]
  },
  {
    id: 'lead-status',
    title: 'Track Lead Progress',
    description: 'Monitor every interaction',
    image: '/demo/status.jpg',
    duration: 7000,
    annotations: [
      {
        text: 'See email open rates and clicks',
        position: { top: '25%', left: '10%' }
      },
      {
        text: 'Track call attempts and outcomes',
        position: { top: '45%', right: '10%' }
      },
      {
        text: 'View complete activity timeline',
        position: { bottom: '20%', left: '50%' },
        highlight: true
      }
    ]
  },
  {
    id: 'lead-notes',
    title: 'Activity & Notes',
    description: 'Full conversation history',
    image: '/demo/notes.jpg',
    duration: 6000,
    annotations: [
      {
        text: 'Email sent: Step 1 of sequence',
        position: { top: '30%', left: '15%' }
      },
      {
        text: 'Email sent: Follow-up (Day 3)',
        position: { top: '45%', left: '15%' }
      },
      {
        text: 'Add manual notes and reminders',
        position: { bottom: '25%', right: '10%' }
      }
    ]
  },
  {
    id: 'lead-reply',
    title: 'Lead Replied!',
    description: 'Instant notifications',
    image: '/demo/reply.jpg',
    duration: 8000,
    annotations: [
      {
        text: '🟣 Lead glows purple when they reply',
        position: { top: '20%', left: '50%' },
        highlight: true
      },
      {
        text: 'Email sequence automatically stops',
        position: { top: '40%', left: '15%' }
      },
      {
        text: 'View the full email thread',
        position: { bottom: '30%', right: '10%' }
      },
      {
        text: 'Get real-time browser notifications',
        position: { bottom: '15%', left: '50%' },
        highlight: true
      }
    ]
  },
  {
    id: 'google-connect',
    title: 'Connect Google Calendar',
    description: 'Seamless scheduling integration',
    image: '/demo/google.jpg',
    duration: 7000,
    annotations: [
      {
        text: 'One-click Google OAuth connection',
        position: { top: '25%', left: '50%' }
      },
      {
        text: 'Sync meetings automatically',
        position: { top: '45%', left: '15%' },
        highlight: true
      },
      {
        text: 'View availability in real-time',
        position: { bottom: '25%', right: '10%' }
      }
    ]
  },
  {
    id: 'calendar',
    title: 'Manage Your Calendar',
    description: 'Schedule meetings with leads',
    image: '/demo/calendar.jpg',
    duration: 7000,
    annotations: [
      {
        text: 'Quick-book meetings with AI title suggestions',
        position: { top: '20%', right: '10%' }
      },
      {
        text: 'See all your meetings at a glance',
        position: { top: '45%', left: '15%' }
      },
      {
        text: 'Automatic lead linking',
        position: { bottom: '20%', left: '50%' },
        highlight: true
      }
    ]
  },
  {
    id: 'outro',
    title: 'NEXUS: Your Lead Automation Platform',
    description: 'Close more deals, faster.',
    image: '/demo/outro.jpg',
    duration: 4000,
    annotations: [
      {
        text: 'Automate outreach • Track engagement • Close deals',
        position: { top: '50%', left: '50%' },
        highlight: true
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

  const currentScene = demoScenes[currentSceneIndex];

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

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Scene counter */}
      <div className="absolute top-6 left-6 text-white/60 text-sm font-mono">
        {currentSceneIndex + 1} / {demoScenes.length}
      </div>

      {/* Main content */}
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] mx-auto flex flex-col items-center justify-center p-8">
        {/* Title and description */}
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            {currentScene.title}
          </h2>
          <p className="text-xl text-white/80">{currentScene.description}</p>
        </div>

        {/* Demo screen mockup */}
        <div className="relative w-full max-w-5xl aspect-video bg-gradient-to-br from-purple-900/20 to-black border-2 border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden animate-scale-in">
          {/* Browser chrome mockup */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/10 to-transparent border-b border-white/10 flex items-center px-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <div className="ml-4 flex-1 h-5 bg-white/5 rounded text-xs text-white/40 flex items-center px-3">
              nexus.lovable.app/{currentScene.id}
            </div>
          </div>

          {/* Content area with mock interface */}
          <div className="pt-8 h-full bg-gradient-to-br from-purple-950/30 via-black to-purple-950/20 relative">
            {/* Annotations */}
            {currentScene.annotations.map((annotation, index) => (
              <div
                key={index}
                className="absolute animate-fade-in"
                style={{
                  ...annotation.position,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${index * 0.3}s`
                }}
              >
                <div
                  className={`px-6 py-3 rounded-lg backdrop-blur-md border shadow-lg ${
                    annotation.highlight
                      ? 'bg-purple-500/90 border-purple-400 text-white font-semibold text-lg'
                      : 'bg-black/60 border-white/20 text-white/90'
                  }`}
                >
                  {annotation.text}
                </div>
                {/* Arrow pointer */}
                {!annotation.highlight && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white/20"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-center space-x-4 mt-8">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentSceneIndex === 0}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-30"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400"
          >
            {currentSceneIndex === demoScenes.length - 1 ? 'Finish' : 'Next'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
