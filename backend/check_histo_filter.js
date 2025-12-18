
// Use native fetch (Node 18+)
async function checkHistoFilter() {
  console.log('Fetching histogram with category=HARDWARE...')
  try {
    const res = await fetch('http://127.0.0.1:3001/api/logs/histogram?category=HARDWARE')
    
    if (!res.ok) {
      console.error('Request failed:', res.status, res.statusText)
      const text = await res.text()
      console.error('Body:', text)
      process.exit(1)
    }

    const data = await res.json()
    console.log(`Received ${data.length} slots.`)
    
    // Count non-empty slots
    const nonEmpty = data.filter(d => Object.keys(d.counts).length > 0)
    console.log(`Non-empty slots: ${nonEmpty.length}`)
    
    if (nonEmpty.length > 0) {
      console.log('Sample data:', JSON.stringify(nonEmpty.slice(0, 3), null, 2))
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

checkHistoFilter()
