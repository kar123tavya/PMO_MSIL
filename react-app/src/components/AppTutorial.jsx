import React, { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AppTutorial() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleStart = () => {
      // Always bring user back to dashboard for the tutorial
      if (window.location.pathname !== '/') {
        navigate('/');
      }
      // Brief delay to ensure dashboard is mounted
      setTimeout(() => setRun(true), 500); 
    };
    window.addEventListener('start-tutorial', handleStart);
    return () => window.removeEventListener('start-tutorial', handleStart);
  }, [navigate]);

  const steps = [
    {
      target: '.sidebar-brand',
      content: 'Welcome to the PMO Dashboard Tutorial! Let\'s take a comprehensive tour of the platform features available here.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#nav-flagship',
      content: 'You can navigate to Flagship Projects to visually track high-priority initiatives through their IL lifecycle.',
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
      content: 'This is the Master Project Table. You can click on any Project Name in this list to edit its details, update its phases, or delete it.',
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
      content: 'Need to add many projects at once? Use the Import button to upload an Excel file and bulk-create projects.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#tour-export',
      content: 'Export your current filtered view (or all data) to a pristine Excel file with a single click.',
      placement: 'bottom',
    },
    {
      target: '#tour-columns',
      content: 'Click here to show, hide, and reorder the table columns exactly how you want them.',
      placement: 'bottom',
    },
    {
      target: '.header-right',
      content: 'Keep an eye on the Notification Bell for approval requests and the Tasks List for your upcoming deadlines. Enjoy!',
      placement: 'left',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, type } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status) || status === STATUS.ERROR || type === 'tour:end') {
      setRun(false);
    }
  };

  if (!user) return null;
  // If we are not on the dashboard, and the tutorial is NOT running, we don't necessarily want to render Joyride and attach it.
  // Wait, if we keep it mounted, we just pass the run state. It's safer to only run it on Dashboard.
  if (location.pathname !== '/') {
      return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      showProgress
      showSkipButton
      hideCloseButton={false}
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
