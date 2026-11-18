# Remote Jobs: hiring history

A daily record of remote hiring at the remote-friendly tech companies listed on
[remotejobs.ghayasuddin.net](https://remotejobs.ghayasuddin.net), recorded by the
[`record-history`](https://github.com/ghayasleo/remote-jobs/blob/main/.github/workflows/record-history.yml)
workflow on the `main` branch. This branch holds only data; the site's code is on `main`.

## Files

- `history/days/YYYY-MM-DD.json`: one file per day, with
  - `insights`: the day's "State of remote hiring" numbers (open remote roles, companies hiring, kinds of work, regions, remote policies, stacks, pay transparency)
  - `hiring`: every company with a readable job board, with its open roles (`total`) and open remote roles (`remote`)
  - `opened`: remote roles that appeared since the previous record (`since`)
  - `closed`: remote roles (`company/id`) that disappeared since then
  - `baseline: true` marks the first record, where `opened` lists every role open that day
- `history/state.json`: the remote roles open at the last record, used to work out the next day's changes.

Recording started on 18 November 2026. A missed day shows up as a longer gap between `since` and `date`.

## Sources and use

Company profiles come from [remoteintech/remote-jobs](https://github.com/remoteintech/remote-jobs) (ISC license). Roles come from the companies' public Greenhouse, Lever, Ashby, Workable and Recruitee job boards. You're welcome to use these numbers; please link to [remotejobs.ghayasuddin.net/insights](https://remotejobs.ghayasuddin.net/insights).
