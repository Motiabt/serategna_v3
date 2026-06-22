import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner, EmptyState } from '../components/ui';
import { PageHeader } from './_shared';
import { JobRow } from './Home';

export function Orders() {
  const nav = useNavigate();
  const { mode } = useAuth();
  const [jobs, setJobs] = useState<any[] | null>(null);

  useEffect(() => {
    api.get<any[]>(`/api/jobs/mine?as=${mode}`).then(setJobs).catch(() => setJobs([]));
  }, [mode]);

  if (jobs === null) return <Spinner />;

  const groups = [
    { key: 'active', label: 'Active', filter: (j: any) => !['confirmed', 'cancelled'].includes(j.status) },
    { key: 'done', label: 'Completed', filter: (j: any) => ['confirmed', 'cancelled'].includes(j.status) },
  ];

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title="My jobs" sub={mode === 'worker' ? 'Jobs you are working' : 'Jobs you posted'} />

      {jobs.length === 0 && (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No jobs yet" sub={mode === 'worker' ? 'Find work in the Jobs tab.' : 'Post a job to get started.'} />
      )}

      {groups.map((g) => {
        const items = jobs.filter(g.filter);
        if (items.length === 0) return null;
        return (
          <div key={g.key} className="px-5 pt-4">
            <h2 className="mb-3 text-base font-bold text-ink">{g.label}</h2>
            <div className="space-y-3">
              {items.map((j) => (
                <JobRow key={j.id} job={j} showStatus onClick={() => nav(`/app/job/${j.id}`)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
