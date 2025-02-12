import { create } from "zustand";

type Job = {
  id: number;
  company: string;
  url: string;
  details: string;
  regions: string;
  technologies: string;
};

export type InputValues = {
  name: string;
  regions: string;
  technologies: string;
  added_regions: string;
  added_technologies: string;
};

interface State {
  jobs: Array<Job>;
  setJobs: (val: Array<Job>) => void;

  value: InputValues;
  setValue: (val: InputValues) => void;
}

const useStore = create<State>()(set => ({
  jobs: [],
  setJobs: (jobs: State["jobs"]) => set({ jobs }),

  value: {
    name: "",
    regions: "",
    technologies: "",
    added_regions: "",
    added_technologies: "",
  },
  setValue: (value: State["value"]) => set({ value })
}));

export default useStore;
