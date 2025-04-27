/* solar-dashboard-code.js - solar project calculator for Fram Energy */

// This file exports a SolarDashboard component that will be used by the HTML file

function SolarDashboard() {
  // State management for inputs, calculations and UI
  const [state, setState] = React.useState('');         // US state
  const [size, setSize] = React.useState(5);            // kW-DC
  const [sizeInput, setSizeInput] = React.useState('5.00'); // Input display string
  const [flows, setFlows] = React.useState([]);         // Cash flow array
  const [price, setPrice] = React.useState(0);          // Electricity price
  const [irr, setIrr] = React.useState(0);              // Internal rate of return
  const [pay, setPay] = React.useState('');             // Payback period
  const [err, setErr] = React.useState('');             // Error messages
  const [loading, setLoading] = React.useState(false);  // Loading state for UI
  const [prices, setPrices] = React.useState({});       // State electricity prices
  const [showTooltip, setShowTooltip] = React.useState(''); // Help tooltip state

  // Model constants
  const COST_W = 2.5;        // Installed cost in $ per watt
  const GEN_KWH_KW = 1400;   // Annual generation in kWh per kW installed
  const ESC = 0.025;         // Electricity price escalation rate
  const OM_KW_YR = 15;       // Annual O&M cost per kW
  const ITC = 0.30;          // Investment tax credit rate (30%)

  // Help text for tooltips
  const tooltips = {
    irr: "Internal Rate of Return (IRR) is the annual rate of growth an investment is expected to generate. Higher IRR means a more profitable investment.",
    payback: "Payback Period is the time it takes for the cumulative cash flow to turn positive, representing how long it takes to recover the initial investment.",
    systemPrice: "Total upfront cost of the solar system before applying tax credits.",
    generation: "Estimated annual electricity production from the solar system.",
    itc: "Investment Tax Credit - a 30% federal tax credit for solar systems installed on residential and commercial properties."
  };

  // Load electricity prices on component mount
  React.useEffect(() => {
    // State electricity prices in $/kWh - from ElectricChoice.com
    setPrices({
      'Alabama': 0.1491, 'Alaska': 0.2238, 'Arizona': 0.1520, 'Arkansas': 0.1174,
      'California': 0.3055, 'Colorado': 0.1516, 'Connecticut': 0.2816,
      'Delaware': 0.1668, 'Florida': 0.1420, 'Georgia': 0.1349, 'Hawaii': 0.4234,
      'Idaho': 0.1097, 'Illinois': 0.1599, 'Indiana': 0.1442, 'Iowa': 0.1243,
      'Kansas': 0.1385, 'Kentucky': 0.1328, 'Louisiana': 0.1170, 'Maine': 0.2629,
      'Maryland': 0.1815, 'Massachusetts': 0.3122, 'Michigan': 0.1841,
      'Minnesota': 0.1405, 'Mississippi': 0.1344, 'Missouri': 0.1157,
      'Montana': 0.1187, 'Nebraska': 0.1078, 'Nevada': 0.1488,
      'New Hampshire': 0.2362, 'New Jersey': 0.1949, 'New Mexico': 0.1426,
      'New York': 0.2437, 'North Carolina': 0.1349, 'North Dakota': 0.1021,
      'Ohio': 0.1598, 'Oklahoma': 0.1152, 'Oregon': 0.1412, 'Pennsylvania': 0.1760,
      'Rhode Island': 0.2531, 'South Carolina': 0.1387, 'South Dakota': 0.1242,
      'Tennessee': 0.1304, 'Texas': 0.1532, 'Utah': 0.1102, 'Vermont': 0.2229,
      'Virginia': 0.1446, 'Washington': 0.1183, 'West Virginia': 0.1451,
      'Wisconsin': 0.1631, 'Wyoming': 0.1178, 'District of Columbia': 0.1883
    });
  }, []);

  // Handle system size input changes
  const handleSizeChange = (e) => {
    const inputVal = e.target.value;
    setSizeInput(inputVal);
    
    // If input is empty or just a decimal point, don't update size
    if (inputVal === '' || inputVal === '.') {
      setSize(0);
      return;
    }
    
    // Convert to number for calculations
    const numValue = parseFloat(inputVal);
    if (!isNaN(numValue)) {
      setSize(numValue);
    }
  };

  // Format display value when focus leaves the input
  const handleSizeBlur = () => {
    if (sizeInput === '' || sizeInput === '.') {
      setSizeInput('');
      return;
    }
    
    const numValue = parseFloat(sizeInput);
    if (!isNaN(numValue)) {
      // Format to 2 decimal places
      setSizeInput(numValue.toFixed(2));
    }
  };

  // Format currency values
  const fmt$ = v => new Intl.NumberFormat('en-US', {
    style: 'currency', 
    currency: 'USD', 
    minimumFractionDigits: 0
  }).format(v);

  // Calculate IRR using Newton-Raphson method
  const irrCalc = cf => {
    let r = 0.1;  // Initial guess
    for (let i = 0; i < 100; i++) {
      const npv = cf.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
      if (Math.abs(npv) < 1e-4) return r;
      
      const d = cf.slice(1).reduce((s, f, t) => s - (t + 1) * f / Math.pow(1 + r, t + 2), 0);
      r -= npv / d;
      
      if (r <= -1) r = -0.99;
    }
    return r;
  };
  
  // Calculate payback period using linear interpolation
  const paybackCalc = flows => {
    // Handle edge case: if first flow is positive, payback is immediate
    if (flows[0] >= 0) return "0.0";
    
    let cum = flows[0]; // Start with Year-0 outlay
    for (let yr = 1; yr < flows.length; yr++) {
      const prev = cum;  // Remember previous cumulative value
      cum += flows[yr];  // Add current year's flow
      
      if (cum >= 0) {    // We've reached or passed the payback point
        // Linear interpolation inside the year
        const fraction = -prev / flows[yr];
        return (yr - 1 + fraction).toFixed(1);
      }
    }
    return ">25"; // Never paid back within the timeframe
  };

  // Main calculation function - runs when Calculate button is clicked
  function run() {
    // Input validation
    if (!state) return setErr('Select a state');
    if (size <= 0) return setErr('Enter a system size > 0');
    
    setErr(''); 
    setLoading(true);
    
    // Basic inputs
    const kW = size;
    const kWh1 = kW * GEN_KWH_KW;
    const capex = kW * 1000 * COST_W;
    const p0 = prices[state] ?? 0.13;
    
    // Calculate year 0 (investment minus ITC)
    const cf = [-capex + capex * ITC];
    
    // Calculate years 1-25 (revenue minus costs)
    for (let y = 1; y <= 25; y++) {
      const p = p0 * Math.pow(1 + ESC, y - 1);
      cf.push(kWh1 * p - kW * OM_KW_YR);
    }
    
    // Update state with results
    setFlows(cf);
    setPrice(p0);
    setIrr(irrCalc(cf) * 100);
    setPay(paybackCalc(cf));
    setLoading(false);
  }

  // Prepare data for chart
  const data = flows.map((f, i) => ({
    year: i,
    annual: f,
    cumulative: flows.slice(0, i + 1).reduce((s, v) => s + v, 0)
  }));

  // Chart tooltip component
  const Tip = ({active, payload, label}) => {
    if (!active) return null;
    return (
      React.createElement('div', {className: "bg-white border rounded shadow p-3 text-sm"}, [
        React.createElement('p', {className: "font-medium", key: "year"}, `Year ${label}`),
        React.createElement('p', {key: "annual"}, `Annual: ${fmt$(payload[0].value)}`),
        React.createElement('p', {key: "cumulative"}, `Cumulative: ${fmt$(payload[1].value)}`)
      ])
    );
  };

  // Tooltip display handler
  const handleTooltip = (type) => {
    setShowTooltip(showTooltip === type ? '' : type);
  };

  // Get the integer part of the payback period for highlighting in the table
  const getPaybackYearInt = () => {
    if (typeof pay !== 'string') return -1;
    if (pay.includes(">")) return -1;
    
    // Extract the number from "X.Y" format
    const match = pay.match(/^(\d+)/);
    return match ? parseInt(match[1]) : -1;
  };

  // Card component for displaying results
  function Card({label, value}) {
    return React.createElement('div', {className: "bg-gray-50 p-4 rounded shadow"}, [
      React.createElement('p', {className: "text-sm text-gray-600", key: "label"}, label),
      React.createElement('p', {className: "text-xl font-bold", key: "value"}, value)
    ]);
  }

  // Main UI component
  return React.createElement('div', {className: "p-6 max-w-6xl mx-auto bg-white"}, [
    // Header
    React.createElement('h1', {
      className: "text-3xl font-bold text-center mb-6",
      key: "title"
    }, "Solar Project Financial Calculator"),
    
    // Inputs section
    React.createElement('div', {
      className: "bg-blue-50 p-6 rounded shadow mb-8",
      key: "inputs"
    }, [
      React.createElement('div', {className: "grid md:grid-cols-2 gap-6", key: "input-grid"}, [
        // State select
        React.createElement('div', {key: "state-input"}, [
          React.createElement('label', {className: "block mb-1 font-medium"}, "US State"),
          React.createElement('select', {
            className: "w-full p-2 border rounded",
            value: state,
            onChange: e => setState(e.target.value)
          }, [
            React.createElement('option', {value: "", key: "default"}, "Select"),
            ...Object.keys(prices).sort().map(s => 
              React.createElement('option', {
                value: s,
                key: s
              }, `${s} ($${prices[s]?.toFixed(2)}/kWh)`)
            )
          ])
        ]),
        
        // System size input
        React.createElement('div', {key: "size-input"}, [
          React.createElement('label', {className: "block mb-1 font-medium"}, "System size (kW-DC)"),
          React.createElement('input', {
            type: "text",
            className: "w-full p-2 border rounded",
            value: sizeInput,
            onChange: handleSizeChange,
            onBlur: handleSizeBlur,
            placeholder: "Enter system size"
          })
        ])
      ]),
      
      // Calculate button
      React.createElement('button', {
        className: "mt-6 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700",
        onClick: run,
        key: "calc-button"
      }, "Calculate"),
      
      // Error message
      err ? React.createElement('p', {
        className: "mt-3 text-red-600",
        key: "error"
      }, err) : null
    ]),
    
    // Results section
    loading ? 
      // Loading indicator
      React.createElement('p', {className: "text-center", key: "loading"}, "Calculating…") 
    : flows.length ? 
      // Results content
      React.createElement(React.Fragment, {key: "results"}, [
        // Result cards
        React.createElement('div', {
          className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8",
          key: "result-cards"
        }, [
          React.createElement(Card, {
            label: "System Cost",
            value: fmt$(size * 1000 * COST_W),
            key: "cost"
          }),
          React.createElement(Card, {
            label: "Annual kWh",
            value: (size * GEN_KWH_KW).toLocaleString(),
            key: "kwh"
          }),
          React.createElement(Card, {
            label: "Elec Price",
            value: `$${price.toFixed(2)}/kWh`,
            key: "price"
          }),
          React.createElement(Card, {
            label: "IRR",
            value: `${irr.toFixed(1)} %`,
            key: "irr"
          }),
          React.createElement(Card, {
            label: "Payback",
            value: `${pay} yr`,
            key: "payback"
          }),
          React.createElement(Card, {
            label: "ITC (30 %)",
            value: fmt$(size * 1000 * COST_W * ITC),
            key: "itc"
          })
        ]),
        
        // Chart
        React.createElement('div', {
          className: "bg-white p-4 rounded shadow",
          style: {height: 400},
          key: "chart"
        }, [
          React.createElement(Recharts.ResponsiveContainer, {
            width: "100%",
            height: "100%",
            key: "chart-container"
          }, [
            React.createElement(Recharts.LineChart, {
              data: data,
              key: "line-chart"
            }, [
              React.createElement(Recharts.CartesianGrid, {
                strokeDasharray: "3 3",
                key: "grid"
              }),
              React.createElement(Recharts.XAxis, {
                dataKey: "year",
                key: "x-axis"
              }),
              React.createElement(Recharts.YAxis, {
                tickFormatter: fmt$,
                key: "y-axis"
              }),
              React.createElement(Recharts.Tooltip, {
                content: Tip,
                key: "tooltip"
              }),
              React.createElement(Recharts.Legend, {key: "legend"}),
              React.createElement(Recharts.Line, {
                type: "monotone",
                dataKey: "annual",
                stroke: "#3b82f6",
                strokeWidth: 2,
                key: "annual-line"
              }),
              React.createElement(Recharts.Line, {
                type: "monotone",
                dataKey: "cumulative",
                stroke: "#10b981",
                strokeWidth: 2,
                key: "cumulative-line"
              })
            ])
          ])
        ])
      ])
    : null
  ]);
}

// Export the component so it's available to the HTML file
window.SolarDashboard = SolarDashboard;
