import React, { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AppTutorial() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleStart = () => setRun(true);
    window.addEventListener('start-tutorial', handleStart);
    return () => window.removeEventListener('start-tutorial', handleStart);
  }, []);

  const steps = [
    {
      target: 'body',
      content: 'Welcome to the PMO Dashboard Tutorial! Let\'s take a quick tour of the platform features.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: 'a[href="/"]',
      content: 'Dashboard: View high-level KPIs, notifications, and all your assigned projects here.',
      placement: 'right',
    },
    {
      target: 'a[href="/flagship"]',
      content: 'Flagship Projects: Track critical high-priority projects through their implementation lifecycle.',
      placement: 'right',
    },
    {
      target: 'a[href="/gantt"]',
      content: 'Gantt Chart: Visualize project timelines, targets, and actual completion dates graphically.',
      placement: 'right',
    },
    {
      target: 'a[href="/audit"]',
      content: 'Audit Log: A comprehensive history of all edits, approvals, and system changes for transparency.',
      placement: 'right',
    },
    {
      target: '.sidebar-footer',
      content: 'You can check your current user role or log out from here.',
      placement: 'right',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, type } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
    }
  };

  if (!user) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#004F98',
          textColor: '#334155',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          zIndex: 10000,
        }
      }}
    />
  );
}
