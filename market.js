(() => {
  'use strict';
  const token = '8X5R1wZ35Pb5jkZAtzeLfyK9gXmdoy2pY4ex4vDqpump';
  const el = id => document.getElementById(id);
  const mobile = window.matchMedia('(max-width: 1000px), (pointer: coarse)').matches;
  if (mobile) {
    el('jupiter-plugin').hidden = true;
    el('swap-status').textContent = 'Tap Load swap when you are ready, or open Jupiter directly.';
    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'btn';
    loadButton.textContent = 'LOAD SWAP';
    el('jupiter-plugin').before(loadButton);
    loadButton.addEventListener('click', () => {
      loadButton.disabled = true;
      loadButton.hidden = true;
      el('jupiter-plugin').hidden = false;
      el('swap-status').textContent = 'Loading swap...';
      loadSwap();
    }, {once:true});
  }
  const money = value => value == null || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(Number(value));
  let busy = false, lastUpdate = null;
  let usdPrice = null, solPrice = null, priceTime = null;
  function calculate() {
    const input=el('calc-amount');
    const amount=Number(input.value);
    const currency=el('calc-currency').value;
    const price=currency === 'SOL' ? solPrice : usdPrice;
    el('calc-result').textContent='—';
    if (input.value.trim()==='' || !Number.isFinite(amount) || amount<0) {
      el('calc-status').textContent='Enter a valid amount of zero or more.'; return;
    }
    if (!price || !priceTime || Date.now()-priceTime.getTime()>120000) {
      el('calc-status').textContent='Current '+currency+' price unavailable. Try Refresh or choose another currency.'; return;
    }
    const result=amount/price;
    if (!Number.isFinite(result)) {el('calc-status').textContent='This amount is too large.';return;}
    el('calc-result').textContent=new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(result);
    el('calc-status').textContent='Estimate based on '+currency+' market price · Updated '+priceTime.toLocaleTimeString();
  }
  el('calc-amount').addEventListener('input',calculate);
  el('calc-currency').addEventListener('change',calculate);
  setInterval(calculate,30000);
  async function refresh() {
    if (busy) return;
    busy = true; el('market-refresh').disabled = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://api.dexscreener.com/token-pairs/v1/solana/' + token, {signal:controller.signal});
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid response');
      const pairs = data.filter(p => p.chainId === 'solana' && p.baseToken?.address === token && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.pairAddress));
      pairs.sort((a,b) => (Number(b.liquidity?.usd)||0)-(Number(a.liquidity?.usd)||0) || (Number(b.volume?.h24)||0)-(Number(a.volume?.h24)||0));
      if (!pairs.length) {
        ['price','change','cap','liquidity','volume','buys','sells'].forEach(key => el('market-'+key).textContent='—');
        el('market-change').removeAttribute('data-direction');
        lastUpdate=null; usdPrice=null; solPrice=null; priceTime=null; calculate();
      window.dispatchEvent(new Event('monky-price-unavailable'));
        el('market-status').textContent='No indexed trading pair found. Try again later.';

        return;
      }
      const p = pairs[0];
      el('market-price').textContent = p.priceUsd != null && Number.isFinite(Number(p.priceUsd)) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumSignificantDigits:6}).format(Number(p.priceUsd)) : '—';
      const change=p.priceChange?.h24;
      el('market-change').textContent=change != null && Number.isFinite(Number(change)) ? (Number(change)>0?'+':'')+Number(change).toFixed(2)+'%' : '—';
      el('market-change').dataset.direction=change==null?'neutral':Number(change)>=0?'up':'down';
      el('market-cap').textContent=money(p.marketCap);
      el('market-liquidity').textContent=money(p.liquidity?.usd);
      el('market-volume').textContent=money(p.volume?.h24);
      ['buys','sells'].forEach(key => { el('market-'+key).textContent=p.txns?.h24?.[key]==null?'—':Number(p.txns.h24[key]).toLocaleString('en-US'); });
      // Prefer the canonical page URL supplied by DexScreener.
      let url='https://dexscreener.com/solana/'+p.pairAddress;
      try {
        const canonical = new URL(p.url);
        if (canonical.origin === 'https://dexscreener.com' &&
            /^\/solana\/[a-zA-Z0-9]+\/?$/.test(canonical.pathname) &&
            !canonical.username && !canonical.password) {
          url = canonical.origin + canonical.pathname;
        }
      } catch { /* Fall back to the validated pool address. */ }
      el('monky-chart-link').href=url;
      usdPrice = Number(p.priceUsd) > 0 && Number.isFinite(Number(p.priceUsd)) ? Number(p.priceUsd) : null;
      const solPool = pairs.find(pair => pair.quoteToken?.address === 'So11111111111111111111111111111111111111112' && Number(pair.priceNative) > 0 && Number.isFinite(Number(pair.priceNative)));
      solPrice = solPool ? Number(solPool.priceNative) : null;
      priceTime = new Date(); calculate();
      if (usdPrice) window.dispatchEvent(new CustomEvent('monky-price', {detail:{price:usdPrice,pair:p.pairAddress,time:priceTime.getTime()}}));
      else window.dispatchEvent(new Event('monky-price-unavailable'));
      lastUpdate=new Date();
      el('market-status').textContent='Updated '+lastUpdate.toLocaleTimeString()+' · Highest-liquidity matching pool';
    } catch {
      usdPrice=null; solPrice=null; priceTime=null; calculate();
      window.dispatchEvent(new Event('monky-price-unavailable'));
      el('market-status').textContent=lastUpdate?'Update failed. Showing older data from '+lastUpdate.toLocaleTimeString()+'.':'Market data unavailable. Check your connection or try Refresh.';
    } finally {clearTimeout(timer);busy=false;el('market-refresh').disabled=false;}
  }
  el('market-refresh').addEventListener('click',() => {
    if (busy) return;

    refresh();
  });
  el('market-copy').addEventListener('click',async () => {
    try {await navigator.clipboard.writeText(token);el('market-copy-status').textContent='Copied!';}
    catch {el('market-copy-status').textContent='Select the contract text to copy it manually.';}
  });
  refresh(); setInterval(() => {if (!document.hidden) refresh();},60000);
  function loadSwap() {
  const script=document.createElement('script');
  script.src='https://plugin.jup.ag/plugin-v1.js'; script.async=true;
  const swapTimeout=setTimeout(() => {el('swap-status').textContent='Swap is taking longer to load. You can open Jupiter below.';},20000);
  script.onerror=() => {clearTimeout(swapTimeout);el('swap-status').textContent='Swap could not load. Open Jupiter below.';};
  script.onload=() => {
    try {
      window.Jupiter.init({displayMode:'integrated',integratedTargetId:'jupiter-plugin',autoConnect:false,
        formProps:{initialInputMint:'So11111111111111111111111111111111111111112',initialOutputMint:token,fixedMint:token},
        containerStyles:{width:'100%',height:'520px'},
        onScreenUpdate:() => {clearTimeout(swapTimeout);el('swap-status').textContent='Quotes and wallet connection are handled by Jupiter.';},
        onSwapError:() => {el('swap-status').textContent='Swap did not complete. Review the message in Jupiter before retrying.';},
        onSuccess:() => {el('swap-status').textContent='Swap completed.';refresh();}});
    } catch {clearTimeout(swapTimeout);el('swap-status').textContent='Swap could not start. Open Jupiter below.';}
  };
  document.head.appendChild(script);
  }
  if (!mobile) loadSwap();
})();
