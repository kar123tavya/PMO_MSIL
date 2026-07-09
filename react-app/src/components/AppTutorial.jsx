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
      content: 'Welcome to the PMO Dashboard Tutorial! Let\'s take a comprehensive tour of the platform.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.sidebar-nav',
      content: 'This is the main Navigation Menu. You can switch between different views of the PMO data from here.',
      placement: 'right',
    },
    {
      target: 'a[href="/"]',
      content: 'The Dashboard (where we are now) is your central hub for KPIs and project tables.',
      placement: 'right',
    },
    {
      target: 'a[href="/flagship"]',
      content: 'Flagship Projects: Click here to visually track critical high-priority projects and their live IL phases.',
      placement: 'right',
    },
    {
      target: 'a[href="/gantt"]',
      content: 'Gantt Chart: Click here to see a beautiful timeline view mapping out start and end dates of all active projects.',
      placement: 'right',
    },
    {
      target: 'a[href="/audit"]',
      content: 'Audit Log: A comprehensive history of all edits, approvals, and system changes for transparency.',
      placement: 'right',
    },
    {
      target: '.search-box',
      content: 'Use this Global Search to instantly find projects by their name, theme, or code.',
      placement: 'bottom',
    },
    {
      target: '.kpi-row',
      content: 'These KPI cards provide a real-time summary of the current filtered projects, calculating man-days, defects, and cost savings.',
      placement: 'bottom',
    },
    {
      target: '#tour-filters',
      content: 'Filter your view by Division, Category, Financial Year, or check the boxes to isolate Flagship or Critical projects.',
      placement: 'top',
    },
    {
      target: '#tour-table',
      content: 'This is the Master Project Table. You can click on any Project Name in this list to edit its details or update its phase targets.',
      placement: 'top',
    },
    {
      target: '#tour-add-project',
      content: 'Click "+ Add Project" to manually create a new project in the system.',
      placement: 'bottom',
    },
    {
      target: '#tour-import',
      content: 'Need to add many projects at once? Use the Import button to upload an Excel file and bulk-create projects.',
      placement: 'bottom',
    },
    {
      target: '#tour-export',
      content: 'Export your current filtered view (or all data) to a pristine Excel file with a single click.',
      placement: 'bottom',
    },
    {
      target: '.header-right',
      content: 'Keep an eye on the Notification Bell for approval requests and edits, and the Tasks List for your upcoming deadlines.',
      placement: 'left',
    },
    {
      target: '.sidebar-footer',
      content: 'You can check your current user role or log out from here. Enjoy using the PMO Dashboard!',
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
