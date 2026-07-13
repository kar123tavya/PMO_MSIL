export function calculateProjectProgress(project) {
  if (!project || !project.il_phases || project.il_phases.length === 0) return 0;
  
  let totalDuration = 0;
  const phaseStats = project.il_phases.map(ph => {
    let start = ph.targetStart || ph.startDate || ph.actualStart;
    let end = ph.targetEnd || ph.endDate || ph.actualEnd;
    
    let duration = 30; // fallback default to 30 days if no dates
    if (start && end) {
      const dStart = new Date(start);
      const dEnd = new Date(end);
      if (!isNaN(dStart) && !isNaN(dEnd)) {
        const diffTime = Math.abs(dEnd - dStart);
        duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // at least 1 day
      }
    }
    
    totalDuration += duration;
    
    let pct = 0;
    if (ph.phaseColor === 'green' || ph.actualEnd || ph.endDate) {
      pct = 1;
    } else if (ph.phaseColor === 'yellow') {
      if (ph.subtasks && ph.subtasks.length > 0) {
        const done = ph.subtasks.filter(s => s.done).length;
        pct = done / ph.subtasks.length;
      } else {
        pct = 0.5; // fallback
      }
    } else {
      if (ph.subtasks && ph.subtasks.length > 0) {
        const done = ph.subtasks.filter(s => s.done).length;
        pct = done / ph.subtasks.length;
      }
    }
    
    return { duration, pct };
  });

  if (totalDuration === 0) return 0;

  let totalProgress = 0;
  phaseStats.forEach(stat => {
    const weight = stat.duration / totalDuration;
    totalProgress += (weight * stat.pct);
  });

  return Math.round(totalProgress * 100);
}
