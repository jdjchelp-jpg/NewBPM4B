import { create } from 'zustand';
export type Theme = 'light' | 'dark' | 'green' | 'blue' | 'red';
export type Route =
  | 'dashboard'
  | 'mp3-to-m4b' | 'single-manifest' | 'folder-to-m4b' | 'm4b-chapters'
  | 'extractor' | 'merge' | 'format' | 'metadata'
  | 'epub' | 'chapters' | 'jobs' | 'history' | 'settings';

export type JobState = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface Job {
  id: string;
  title: string;
  kind: string;
  state: JobState;
  progress: number;
  detail?: string;
  createdAt: number;
  updatedAt: number;
}

const JOBS_STORAGE_KEY = 'bpm4b.jobs.v1';

function loadJobs(): Job[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(JOBS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    let recovered = false;
    const jobs = stored.filter((job): job is Job => !!job && typeof job.id === 'string' && typeof job.title === 'string').map((job) => {
      if (job.state !== 'processing' && job.state !== 'queued') return job;
      recovered = true;
      return { ...job, state: 'failed' as const, detail: 'Interrupted when BPM4B closed', updatedAt: Date.now() };
    });
    if (recovered) saveJobs(jobs);
    return jobs;
  } catch { return []; }
}

function saveJobs(jobs: Job[]) {
  try { localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs)); } catch { /* storage can be unavailable or full */ }
}

interface State {
  theme: Theme; route: Route; volume: number; soundEnabled: boolean;
  bitrate: string; qualityId: string; search: string;
  jobs: Job[];
  setTheme: (t: Theme) => void; setRoute: (r: Route) => void; setVolume: (v: number) => void;
  setSoundEnabled: (on: boolean) => void;
  setQuality: (id: string, bitrate: string) => void;
  setSearch: (s: string) => void;
  addJob: (job: { title: string; kind: string; state?: JobState; progress?: number; detail?: string }) => string;
  updateJob: (id: string, patch: Partial<Omit<Job, 'id' | 'createdAt'>>) => void;
  removeJob: (id: string) => void;
  clearJobs: () => void;
}

export const useApp = create<State>((set) => ({
  theme: 'dark', route: 'dashboard', volume: 0.7, soundEnabled: true,
  bitrate: '96k', qualityId: 'high', search: '',
  jobs: loadJobs(),
  setTheme: (theme) => { document.documentElement.dataset.theme = theme; set({ theme }); },
  setRoute: (route) => set({ route }),
  setVolume: (volume) => set({ volume }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setQuality: (qualityId, bitrate) => set({ qualityId, bitrate }),
  setSearch: (search) => set({ search }),
  addJob: (job) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const entry: Job = { state: 'queued', progress: 0, ...job, id, createdAt: now, updatedAt: now };
    set((s) => { const jobs = [entry, ...s.jobs]; saveJobs(jobs); return { jobs }; });
    return id;
  },
  updateJob: (id, patch) => set((s) => { const jobs = s.jobs.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: Date.now() } : j)); saveJobs(jobs); return { jobs }; }),
  removeJob: (id) => set((s) => { const jobs = s.jobs.filter((j) => j.id !== id); saveJobs(jobs); return { jobs }; }),
  clearJobs: () => { saveJobs([]); set({ jobs: [] }); },
}));
