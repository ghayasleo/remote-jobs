# Remote Job Navigator

A curated repository for remote-friendly companies and job listings in tech. This project pulls in data from the [remoteintech/remote-jobs](https://github.com/remoteintech/remote-jobs) repository (licensed under [CC0 1.0 Universal](https://github.com/remoteintech/remote-jobs/blob/main/LICENSE)) and displays it in an easy-to-navigate format.

## Overview

Remote Job Navigator makes it simple for job seekers to browse companies that support remote work. The data is sourced directly from [remoteintech/remote-jobs](https://github.com/remoteintech/remote-jobs), and we leverage a Markdown parser to convert the raw README content into a user-friendly HTML interface.

## How It Works

- **Data Source:** We fetch the latest Markdown file (README.md) from the upstream repository.
- **Markdown Parsing:** The raw Markdown is converted into HTML using a parser ([marked](https://github.com/markedjs/marked)).
- **Display:** The parsed HTML is rendered on our website, showing a structured list of remote-friendly companies, their websites, and regions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- npm or yarn

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/ghayasleo/remote-jobs.git
   cd your-repo
