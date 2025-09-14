# Garak Report Visualizer

A modern React/Next.js application for visualizing Garak security testing reports. This tool provides an intuitive interface to explore test results, analyze vulnerabilities, and drill down into specific test attempts and responses.

## Features

- **Dashboard Overview**: High-level summary of test categories, success rates, and vulnerability counts
- **Category Grouping**: Tests are automatically grouped by probe categories (e.g., ANSI Escape, DAN, Encoding Injection)
- **Interactive Cards**: Click on any category card to view detailed results
- **Expandable Details**: View individual test attempts, prompts, responses, and detector scores
- **Search Functionality**: Filter categories by name
- **Modern UI**: Clean, responsive design built with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the src directory:
   ```bash
   cd src
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Data Structure

The application expects Garak report data in JSONL format with the following structure:

- **Attempt entries**: Contain probe information, prompts, responses, and detector results
- **Probe categories**: Automatically extracted from probe classnames (e.g., `ansiescape.AnsiEscaped` → `ansiescape`)
- **Scoring**: Detector results are analyzed to calculate vulnerability rates and success metrics

## Project Structure

```
src/
├── app/
│   ├── api/garak-report/route.ts    # API endpoint for serving report data
│   ├── page.tsx                     # Main application page
│   └── layout.tsx                   # App layout
├── components/
│   ├── GarakDashboard.tsx           # Main dashboard component
│   └── CategoryCard.tsx             # Individual category display
└── lib/
    └── garak-parser.ts              # Data parsing and utility functions
```

## API Endpoints

- `GET /api/garak-report` - Serves the raw JSONL report data

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Hooks** - State management and side effects

## Customization

The application can be easily customized by:

1. **Adding new probe categories**: Update the `getDisplayName` function in `garak-parser.ts`
2. **Modifying scoring logic**: Adjust the vulnerability detection thresholds
3. **Styling changes**: Update Tailwind classes throughout the components
4. **Additional metrics**: Extend the data parsing to include more statistics

## Data Source

The application currently reads from:
```
../data/garak.eb4baeec-454d-4c7f-b9de-7382955f0d44.report.jsonl
```

To use with different report files, update the file path in `src/app/api/garak-report/route.ts`.
