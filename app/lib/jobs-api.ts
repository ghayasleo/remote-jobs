const api = "https://raw.githubusercontent.com/remoteintech/remote-jobs";

export const jobsApi = () => `${api}/main/README.md`;
export const getJobDetails = (slug: string) => `${api}/main/${slug}`;
