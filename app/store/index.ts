import { create } from "zustand";

type Job = {
  id: number;
  company: string;
  url: string;
  details: string;
  regions: string;
  technologies: string;
};

interface State {
  jobs: Array<Job>;
  setJobs: (val: Array<Job>) => void;
}

const useStore = create<State>()(set => ({
  jobs: [],
  setJobs: (jobs: State["jobs"]) => set({ jobs }),
}));

export default useStore;
