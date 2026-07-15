import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, EVENTS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AppTutorial() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleStart = () => {
      if (window.location.pathname !== '/') navigate('/');
      setTimeout(() => setRun(true), 500);
    };
    window.addEventListener('start-tutorial', handleStart);
    return () => window.removeEventListener('start-tutorial', handleStart);
  }, [navigate]);

  const steps = [
    {
      target: '.sidebar-brand',
      content: 'Welcome to the PMO Dashboard! This tour will walk you through all the key features. Click Next to continue, or press the ✕ button at any time to close.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#nav-flagship',
      content: 'Navigate to Flagship Projects to visually track high-priority initiatives through their IL lifecycle.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#nav-gantt',
      content: 'Use the Gantt Chart to see a graphical timeline of all active projects.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#nav-audit',
      content: 'The Audit Log keeps a complete history of all project edits, status changes, and approvals.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '.search-box',
      content: 'Use this Global Search to instantly find projects by their name, theme, or code.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.kpi-row',
      content: 'These KPI cards provide a real-time summary of your current project landscape.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#tour-filters',
      content: 'Filter your view by Division, Category, Financial Year, or check the boxes to isolate Flagship or Critical projects.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '#tour-table',
      content: 'This is the Master Project Table. Click any Project Name to edit its details, update its phases, or delete it.',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '#tour-add-project',
      content: 'Click "+ Add Project" to manually create a new project in the system.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#tour-import',
      content: 'Need to add many projects at once? Use Import to upload an Excel file and bulk-create projects.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#tour-export',
      content: 'Export your current filtered view to a clean Excel file with a single click.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#tour-columns',
      content: 'Click here to show, hide, and reorder the table columns exactly how you want them.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.header-right',
      content: 'Keep an eye on the Notification Bell for approval requests. Enjoy the platform!',
      placement: 'left',
      disableBeacon: true,
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, type, action } = data;
    if (
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status) ||
      status === STATUS.ERROR ||
      type === EVENTS.TOUR_END ||
      action === 'close' || 
      action === 'skip' ||
      type === EVENTS.TARGET_NOT_FOUND
    ) {
      setRun(false);
    }
  };

  // Only render when running and on dashboard
  if (!user || !run || location.pathname !== '/') return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      disableOverlayClose={false}
      hideCloseButton={false}
      callback={handleJoyrideCallback}
      locale={{
        back: 'Back',
        close: '✕ Close',
        last: 'Finish',
        next: 'Next →',
        skip: 'Skip Tour',
      }}
      styles={{
        options: {
          primaryColor: '#004F98',
          textColor: '#334155',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          zIndex: 10000,
        },
        buttonClose: {
          color: '#64748b',
          fontSize: 18,
          fontWeight: 700,
          top: 8,
          right: 8,
        },
        buttonSkip: {
          color: '#ef4444',
          fontWeight: 600,
        },
      }}
    />
  );
}
