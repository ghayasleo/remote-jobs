import { create } from "zustand";

export type InputValues = {
  name: string;
  regions: string;
  technologies: string;
  added_regions: string;
  added_technologies: string;
};

interface State {
  value: InputValues;
  setValue: (val: InputValues) => void;
}

const useStore = create<State>()(set => ({
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
