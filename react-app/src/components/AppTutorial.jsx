import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AppTutorial() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleStart = () => {
      // Force navigation to dashboard on start
      if (window.location.pathname !== '/') {
        navigate('/');
      }
      setRun(false); // Reset completely
      setStepIndex(0);
      setTimeout(() => setRun(true), 400); // Give time for transition
    };
    window.addEventListener('start-tutorial', handleStart);
    return () => window.removeEventListener('start-tutorial', handleStart);
  }, [navigate]);

  const steps = [
    // 0
    {
      target: '.app-shell',
      content: 'Welcome to the PMO Dashboard Tutorial! Let\'s take a comprehensive tour of the platform.',
      placement: 'center',
      disableBeacon: true,
    },
    // 1
    {
      target: '.sidebar-nav',
      content: 'This is the main Navigation Menu. You can switch between different views of the PMO data from here.',
      placement: 'right',
    },
    // 2
    {
      target: '#nav-flagship',
      content: 'Let\'s check out Flagship Projects. We will navigate there now to see how you can track critical milestones.',
      placement: 'right',
    },
    // 3 - Flagship View
    {
      target: '.app-shell',
      content: 'This is the Flagship Projects view! You can visually track high-priority projects through their IL lifecycle here. Click any project card here to edit or update phases.',
      placement: 'center',
    },
    // 4
    {
      target: '#nav-gantt',
      content: 'Now, let\'s head over to the Gantt Chart to see project timelines!',
      placement: 'right',
    },
    // 5 - Gantt View
    {
      target: '.app-shell',
      content: 'The Gantt Chart provides a graphical timeline of all active projects, comparing target dates against actual progress. Double-click a bar to edit its details.',
      placement: 'center',
    },
    // 6
    {
      target: '#nav-dashboard',
      content: 'Let\'s head back to the main Dashboard to explore the management tools.',
      placement: 'right',
    },
    // 7 - Dashboard View
    {
      target: '.search-box',
      content: 'Use this Global Search to instantly find projects by their name, theme, or code.',
      placement: 'bottom',
    },
    // 8
    {
      target: '.kpi-row',
      content: 'These KPI cards provide a real-time summary of the currently filtered projects.',
      placement: 'bottom',
    },
    // 9
    {
      target: '#tour-filters',
      content: 'Filter your view by Division, Category, Financial Year, or check the boxes to isolate Flagship or Critical projects.',
      placement: 'top',
    },
    // 10
    {
      target: '#tour-table',
      content: 'This is the Master Project Table. You can click on any Project Name in this list to edit its details, update its phases, or delete it.',
      placement: 'top',
    },
    // 11
    {
      target: '#tour-add-project',
      content: 'Click "+ Add Project" to manually create a new project in the system.',
      placement: 'bottom',
    },
    // 12
    {
      target: '#tour-import',
      content: 'Need to add many projects at once? Use the Import button to upload an Excel file and bulk-create projects.',
      placement: 'bottom',
    },
    // 13
    {
      target: '#tour-export',
      content: 'Export your current filtered view (or all data) to a pristine Excel file with a single click.',
      placement: 'bottom',
    },
    // 14
    {
      target: '.header-right',
      content: 'Keep an eye on the Notification Bell for approval requests and edits, and the Tasks List for your upcoming deadlines. Enjoy!',
      placement: 'left',
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { action, index, status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || type === EVENTS.TOUR_END) {
      setRun(false);
      setStepIndex(0);
      return;
    }
    if (status === STATUS.ERROR) {
       setRun(false);
       setStepIndex(0);
       return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Determine direction
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // Step 3 requires being on /flagship
      if (nextStepIndex === 3 && location.pathname !== '/flagship') {
        setRun(false);
        navigate('/flagship');
        setTimeout(() => { setStepIndex(nextStepIndex); setRun(true); }, 600);
        return;
      }
      
      // Step 5 requires being on /gantt
      if (nextStepIndex === 5 && location.pathname !== '/gantt') {
        setRun(false);
        navigate('/gantt');
        setTimeout(() => { setStepIndex(nextStepIndex); setRun(true); }, 600);
        return;
      }

      // Step 7+ requires being on /
      if (nextStepIndex >= 7 && location.pathname !== '/') {
        setRun(false);
        navigate('/');
        setTimeout(() => { setStepIndex(nextStepIndex); setRun(true); }, 600);
        return;
      }
      
      // Moving backwards handling
      if (nextStepIndex === 2 && location.pathname !== '/') {
        setRun(false);
        navigate('/');
        setTimeout(() => { setStepIndex(nextStepIndex); setRun(true); }, 600);
        return;
      }
      
      if (nextStepIndex === 4 && location.pathname !== '/flagship') {
        setRun(false);
        navigate('/flagship');
        setTimeout(() => { setStepIndex(nextStepIndex); setRun(true); }, 600);
        return;
      }

      setStepIndex(nextStepIndex);
    }
  };

  if (!user) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
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
