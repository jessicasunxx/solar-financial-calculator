

# Solar Project Financial Calculator

This is a web-based calculator that evaluates the financial viability of solar PV investments across the United States.


## Overview

This tool allows users to quickly calculate key financial metrics for a potential solar project by inputting their location (US state) and system size. The calculator provides:

- System cost and projected annual generation
- 25-year cash flow projection with visualization
- Internal Rate of Return (IRR)
- Payback period
- Investment Tax Credit (ITC) value

## Features

- **Simple Interface**: Enter state and system size to get comprehensive financial analysis
- **Interactive Visualization**: Chart showing annual and cumulative cash flows
- **Detailed Results**: Complete 25-year cash flow table with highlighted payback year
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **No Server Required**: Runs entirely in the browser using client-side JavaScript

## Setup Instructions

### Option 1: Access Online

1. Simply visit the live calculator at: https://jessicasunxx.github.io/solar-financial-calculator/solar-dashboard.html
2. No installation or downloads required - works in any modern browser

### Option 2: Run Locally

1. Clone this repository or download the files:
   git clone https://github.com/jessicasunxx/solar-financial-calculator.git

2. Navigate to the project directory:
   cd solar-financial-calculator

3. Open solar-dashboard.html in any modern web browser.

## Technical Details

### Dependencies (loaded via CDN)
- React (18.x)
- Recharts (2.5.x)
- Tailwind CSS
- Babel (for JSX transformation)

## Financial Model

The calculator uses standard financial metrics for solar project evaluation:
- System pricing at $2.50/W
- 30% Investment Tax Credit (ITC)
- State-specific electricity pricing
- 2.5% annual electricity price escalation
- $15/kW annual operations & maintenance costs
- 25-year project timeline

## Author

Jessica Sun- js6174@barnard.edu

## Acknowledgments

- Electricity pricing data from [ElectricChoice.com](https://www.electricchoice.com/electricity-prices-by-state/)
- Created as a work sample for Fram Energy
