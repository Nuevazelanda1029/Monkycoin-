(() => {
  'use strict';
  const token = '8X5R1wZ35Pb5jkZAtzeLfyK9gXmdoy2pY4ex4vDqpump';
  const status = document.getElementById('history-status');
  const button = document.getElementById('history-retry');
  const frame = document.getElementById('history-frame');
  const link = document.getElementById('history-link');
  let busy = false;
  async function load() {
    if (busy) return;
    busy = true; button.disabled = true;
    status.textContent = 'Finding MONKY history on GeckoTerminal...';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.geckoterminal.com/api/v2/networks/solana/tokens/' + token + '/pools', {signal:controller.signal});
      if (!response.ok) throw new Error('Provider unavailable');
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error('Invalid response');
      const pools = result.data.filter(p => p.relationships?.base_token?.data?.id === 'solana_' + token &&
        /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.attributes?.address));
      pools.sort((a,b) => (Number(b.attributes.reserve_in_usd)||0)-(Number(a.attributes.reserve_in_usd)||0));
      if (!pools.length) {
        frame.hidden = true; frame.removeAttribute('src');
        status.textContent = 'GeckoTerminal has no matching MONKY pool available. Historical chart unavailable.';
        return;
      }
      const url = 'https://www.geckoterminal.com/solana/pools/' + pools[0].attributes.address;
      link.href = url;
      frame.src = url + '?embed=1&info=0&swaps=0&light_chart=0&chart_type=price&resolution=15m&bg_color=111111';
      frame.hidden = false;
      status.textContent = 'Historical chart via GeckoTerminal. If the viewer stays loading, open the chart above or press Retry.';
    } catch {
      status.textContent = frame.hidden ? 'Unable to reach GeckoTerminal. Press Retry or open GeckoTerminal above.' : 'Refresh failed. The existing chart is still displayed.';
    } finally {clearTimeout(timeout);busy=false;button.disabled=false;}
  }
  button.addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {observer.disconnect();load();}
    }, {rootMargin:'100px'});
    observer.observe(document.getElementById('history-chart'));
  } else load();
})();
