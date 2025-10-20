import React, { createContext, useContext, useState } from 'react';

interface DemoContextType {
  isDemoActive: boolean;
  currentDemoStep: number;
  setDemoActive: (active: boolean) => void;
  setCurrentDemoStep: (step: number) => void;
  getFakeCampaigns: () => any[];
  getFakeLeads: () => any[];
  getFakeEmailLogs: () => any[];
  getFakeCallLogs: () => any[];
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [currentDemoStep, setCurrentDemoStep] = useState(0);

  const getFakeCampaigns = () => [
    {
      id: 'demo-campaign-1',
      name: 'Tech Startup Outreach',
      from_name: 'Scott | PSN',
      from_email: 'scott@psn.com',
      subject: 'Partnership Opportunity with {{company}}',
      body: 'Hi {{first_name}},\n\nI noticed your work at {{company}} and thought there might be a great opportunity for us to collaborate...',
      is_active: true,
      is_default: true,
      delivery_rules: {
        use_email: true,
        use_calls: true,
        email: { send_initial: true },
        call: { window_start: 9, window_end: 18, max_attempts: 3 }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const getFakeLeads = () => [
    {
      id: 'demo-lead-1',
      first_name: 'Sarah',
      last_name: 'Chen',
      name: 'Sarah Chen',
      email: 'sarah.chen@techstartup.io',
      company: 'TechStartup Inc',
      company_name: 'TechStartup Inc',
      job_title: 'VP of Engineering',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      status: 'replied',
      last_reply_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      last_reply_subject: 'Re: Partnership Opportunity with TechStartup Inc',
      last_reply_snippet: 'Hi Scott, this sounds interesting! Would love to learn more...',
      email_status: 'replied',
      linkedin_url: 'https://linkedin.com/in/sarachen',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-lead-2',
      first_name: 'Michael',
      last_name: 'Rodriguez',
      name: 'Michael Rodriguez',
      email: 'michael@innovateai.com',
      company: 'InnovateAI',
      company_name: 'InnovateAI',
      job_title: 'CEO',
      phone: '+1 (555) 234-5678',
      location: 'Austin, TX',
      status: 'contacted',
      email_status: 'opened',
      linkedin_url: 'https://linkedin.com/in/mrodriguez',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-lead-3',
      first_name: 'Jennifer',
      last_name: 'Park',
      name: 'Jennifer Park',
      email: 'jennifer.park@cloudnine.com',
      company: 'CloudNine Solutions',
      company_name: 'CloudNine Solutions',
      job_title: 'Head of Sales',
      phone: '+1 (555) 345-6789',
      location: 'Seattle, WA',
      status: 'new',
      linkedin_url: 'https://linkedin.com/in/jpark',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-lead-4',
      first_name: 'David',
      last_name: 'Thompson',
      name: 'David Thompson',
      email: 'david@digitalwave.com',
      company: 'DigitalWave',
      company_name: 'DigitalWave',
      job_title: 'CTO',
      phone: '+1 (555) 456-7890',
      location: 'New York, NY',
      status: 'new',
      linkedin_url: 'https://linkedin.com/in/dthompson',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ];

  const getFakeEmailLogs = () => [
    {
      id: 'demo-email-1',
      lead_id: 'demo-lead-1',
      subject: 'Partnership Opportunity with TechStartup Inc',
      body: 'Hi Sarah,\n\nI noticed your work at TechStartup Inc and thought there might be a great opportunity for us to collaborate...',
      status: 'sent',
      direction: 'outbound',
      step_number: 1,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      to_email: 'sarah.chen@techstartup.io',
      from_email: 'scott@psn.com'
    },
    {
      id: 'demo-email-2',
      lead_id: 'demo-lead-1',
      subject: 'Following up on partnership',
      body: 'Hi Sarah,\n\nJust wanted to follow up on my previous email...',
      status: 'sent',
      direction: 'outbound',
      step_number: 2,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      to_email: 'sarah.chen@techstartup.io',
      from_email: 'scott@psn.com'
    },
    {
      id: 'demo-email-3',
      lead_id: 'demo-lead-1',
      subject: 'Re: Partnership Opportunity with TechStartup Inc',
      body: 'Hi Scott,\n\nThis sounds interesting! Would love to learn more about what you have in mind.\n\nBest,\nSarah',
      status: 'received',
      direction: 'inbound',
      snippet: 'Hi Scott, this sounds interesting! Would love to learn more...',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      to_email: 'scott@psn.com',
      from_email: 'sarah.chen@techstartup.io'
    },
    {
      id: 'demo-email-4',
      lead_id: 'demo-lead-2',
      subject: 'Partnership Opportunity with InnovateAI',
      body: 'Hi Michael,\n\nI noticed your work at InnovateAI...',
      status: 'opened',
      direction: 'outbound',
      step_number: 1,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      to_email: 'michael@innovateai.com',
      from_email: 'scott@psn.com'
    }
  ];

  const getFakeCallLogs = () => [
    {
      id: 'demo-call-1',
      lead_id: 'demo-lead-2',
      call_status: 'completed',
      answered: true,
      duration_seconds: 180,
      notes: 'Great conversation about potential partnership. Interested in scheduling a follow-up meeting.',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 180000).toISOString()
    }
  ];

  const setDemoActive = (active: boolean) => {
    setIsDemoActive(active);
    if (!active) {
      setCurrentDemoStep(0);
    }
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoActive,
        currentDemoStep,
        setDemoActive,
        setCurrentDemoStep,
        getFakeCampaigns,
        getFakeLeads,
        getFakeEmailLogs,
        getFakeCallLogs
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within DemoProvider');
  }
  return context;
};
