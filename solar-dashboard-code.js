/* solar-dashboard-code.js - solar project calculator for Fram Energy*/

const { useState, useEffect } = React;
const {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} = Recharts;


function SolarDashboard() {
  //state manegement for inputs, calculations and ui
  const [state, setState]   = useState('');         //us states
  const [size,  setSize]    = useState(5);          // kW-DC
  const [sizeInput, setSizeInput] = useState('5.00'); // Input display string
  const [flows, setFlows]   = useState([]);         //cash flow array
  const [price, setPrice]   = useState(0);          //electricity price
  const [irr,   setIrr]     = useState(0);          //internal rate of return
  const [pay,   setPay]     = useState('');         //payback period
  const [err,   setErr]     = useState('');         //error messages
  const [loading, setLoading] = useState(false);    //loading state for UI
  const [prices, setPrices] = useState({});         //state electrity prices

  //model constants
  const COST_W = 2.5;
  const GEN_KWH_KW = 1400;
  const ESC = 0.025;
  const OM_KW_YR = 15;
  const ITC = 0.30;

  //load electricty prices on component mount, state electrity prices inin $/kWh - from ElectricChoice.com
  useEffect(() => {
    setPrices({
      Alabama:0.1491, Alaska:0.2238, Arizona:0.1520, Arkansas:0.1174,
      California:0.3055, Colorado:0.1516, Connecticut:0.2816,
      Delaware:0.1668, Florida:0.1420, Georgia:0.1349, Hawaii:0.4234,
      Idaho:0.1097, Illinois:0.1599, Indiana:0.1442, Iowa:0.1243,
      Kansas:0.1385, Kentucky:0.1328, Louisiana:0.1170, Maine:0.2629,
      Maryland:0.1815, Massachusetts:0.3122, Michigan:0.1841,
      Minnesota:0.1405, Mississippi:0.1344, Missouri:0.1157,
      Montana:0.1187, Nebraska:0.1078, Nevada:0.1488,
      'New Hampshire':0.2362, 'New Jersey':0.1949, 'New Mexico':0.1426,
      'New York':0.2437, 'North Carolina':0.1349, 'North Dakota':0.1021,
      Ohio:0.1598, Oklahoma:0.1152, Oregon:0.1412, Pennsylvania:0.1760,
      'Rhode Island':0.2531, 'South Carolina':0.1387, 'South Dakota':0.1242,
      Tennessee:0.1304, Texas:0.1532, Utah:0.1102, Vermont:0.2229,
      Virginia:0.1446, Washington:0.1183, 'West Virginia':0.1451,
      Wisconsin:0.1631, Wyoming:0.1178, 'District of Columbia':0.1883
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
    
    //convert to number for calculations
    const numValue = parseFloat(inputVal);
    if (!isNaN(numValue)) {
      setSize(numValue);
    }
  };

  // format display value when focus leaves the input
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

  //format currency value 
  const fmt$ = v => new Intl.NumberFormat('en-US',{
    style:'currency',currency:'USD',minimumFractionDigits:0}).format(v);

    //im calculating irr using newton-raphson method, and it needs a drivative calculation
  const irrCalc = cf => {
    let r = 0.1;
    for (let i = 0; i < 100; i++) {
      const npv = cf.reduce((s,f,t)=>s+f/Math.pow(1+r,t),0);
      if (Math.abs(npv) < 1e-4) return r;
      const d   = cf.slice(1).reduce((s,f,t)=>s-(t+1)*f/Math.pow(1+r,t+2),0);
      r -= npv / d;
      if (r <= -1) r = -0.99;
    }
    return r;
  };
  
    //caluclate the payback period using linear interpolation
  const paybackCalc = flows => {
    // Handle edge case: if first flow is positive, payback is immediate
    if (flows[0] >= 0) return "0.0";
    
    let cum = flows[0]; // Start with Year-0 outlay
    for (let yr = 1; yr < flows.length; yr++) {
      const prev = cum;  // Remember previous cumulative value
      cum += flows[yr];  // Add current year's flow
      if (cum >= 0) {    // That means we reached or passed the payback point
        // Linear interpolation inside the year:
        // If prev = -100 and we add 400 to get cum = 300,
        // then payback happened 100/400 = 0.25 of the way through the year
        const fraction = -prev / flows[yr];
        return (yr - 1 + fraction).toFixed(1);
      }
    }
    return ">25"; // Never paid back within the timeframe
  };

  //main function for user clicks calculate button
  function run() {
    //input validation
    if (!state)     return setErr('Select a state');
    if (size <= 0)  return setErr('Enter a system size > 0');
    setErr(''); setLoading(true);
    
    
    const kW  = size;
    const kWh1= kW * GEN_KWH_KW;
    const capex = kW*1000*COST_W;
    const p0  = prices[state] ?? 0.13;
    
    //calculate year 0
    const cf = [-capex + capex*ITC];
    
    //caluclate year 1-25 (revenue minus cost)
    for (let y=1; y<=25; y++) {
      const p = p0 * Math.pow(1+ESC, y-1);
      cf.push(kWh1*p - kW*OM_KW_YR);
    }
    
    //update state with results
    setFlows(cf);
    setPrice(p0);
    setIrr(irrCalc(cf)*100);
    setPay(paybackCalc(cf));
    setLoading(false);
  }

  //chart data
  const data = flows.map((f,i)=>({
    year:i,
    annual:f,
    cumulative: flows.slice(0,i+1).reduce((s,v)=>s+v,0)
  }));

  const Tip = ({active,payload,label})=>{
    if (!active) return null;
    return (
      <div className="bg-white border rounded shadow p-3 text-sm">
        <p className="font-medium">Year {label}</p>
        <p>Annual&nbsp;&nbsp;{fmt$(payload[0].value)}</p>
        <p>Cumulative {fmt$(payload[1].value)}</p>
      </div>
    );
  };

  //ui design
  return (
    <div className="p-6 max-w-6xl mx-auto bg-white">
      <h1 className="text-3xl font-bold text-center mb-6">
        Solar Project Financial Calculator
      </h1>

      {/* inputs */}
      <div className="bg-blue-50 p-6 rounded shadow mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-1 font-medium">US State</label>
            <select className="w-full p-2 border rounded"
              value={state} onChange={e=>setState(e.target.value)}>
              <option value="">Select</option>
              {Object.keys(prices).sort().map(s=>
                <option key={s} value={s}>{s} (${prices[s]?.toFixed(2)}/kWh)</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">System size (kW-DC)</label>
            <input type="text" 
              className="w-full p-2 border rounded"
              value={sizeInput} 
              onChange={handleSizeChange}
              onBlur={handleSizeBlur}
              placeholder="Enter system size" />
          </div>
        </div>
        <button onClick={run}
          className="mt-6 bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700">
          Calculate
        </button>
        {err && <p className="mt-3 text-red-600">{err}</p>}
      </div>

      {/* results */}
      {loading ? (
        <p className="text-center">Calculating…</p>
      ) : flows.length ? (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card label="System Cost" value={fmt$(size*1000*COST_W)} />
            <Card label="Annual kWh"  value={(size*GEN_KWH_KW).toLocaleString()} />
            <Card label="Elec Price"  value={`$${price.toFixed(2)}/kWh`} />
            <Card label="IRR"         value={`${irr.toFixed(1)} %`} />
            <Card label="Payback"     value={`${pay} yr`} />
            <Card label="ITC (30 %)"  value={fmt$(size*1000*COST_W*ITC)} />
          </div>

          <div className="bg-white p-4 rounded shadow" style={{height:400}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="year"/>
                <YAxis tickFormatter={fmt$}/>
                <Tooltip content={<Tip/>}/>
                <Legend/>
                <Line type="monotone" dataKey="annual"     stroke="#3b82f6" strokeWidth={2}/>
                <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : null}
    </div>
  );

  function Card({label,value}){
    return (
      <div className="bg-gray-50 p-4 rounded shadow">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    );
  }
}

// expose globally so solar.html can render it 
window.SolarDashboard = SolarDashboard;