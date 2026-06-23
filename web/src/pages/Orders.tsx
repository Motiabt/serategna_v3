import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { Spinner, EmptyState } from '../components/ui';
import { PageHeader } from './_shared';
import { JobRow } from './Home';

export function Orders() {
  const nav = useNavigate();
  const { mode } = useAuth();
  const { t } = useI18n();
  const [jobs, setJobs] = useState<any[] | null>(null);

  useEffect(() => {
    api.get<any[]>(`/api/jobs/mine?as=${mode}`).then(setJobs).catch(() => setJobs([]));
  }, [mode]);

  if (jobs === null) return <Spinner />;

  const groups = [
    { key: 'active', label: t('activeWord'), filter: (j: any) => !['confirmed', 'cancelled'].includes(j.status) },
    { key: 'done', label: t('completedWord'), filter: (j: any) => ['confirmed', 'cancelled'].includes(j.status) },
  ];

  return (
    <div className="h-full overflow-y-auto pb-6 no-scrollbar">
      <PageHeader title={t('myJobs')} sub={mode === 'worker' ? t('jobsYouWork') : t('jobsYouPosted')} />

      {jobs.length === 0 && (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title={t('noJobsYet')} sub={mode === 'worker' ? t('findWorkTab') : t('postJobToStart')} />
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
