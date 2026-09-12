(() => {
  'use strict';
  const points = [];
  let pool = '';
  const node = id => document.getElementById(id);
  const priceLabel = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumSignificantDigits:5}).format(value);
  window.addEventListener('monky-price', event => {
    const {price, pair, time} = event.detail;
    if (!(price > 0) || !Number.isFinite(price) || !Number.isFinite(time)) return;
    if (pool !== pair) { points.length = 0; pool = pair; }
    const previous = points[points.length-1];
    if (previous && time - previous.time < 1000) points[points.length-1] = {price,time};
    else points.push({price,time});
    if (points.length > 120) points.shift();
    const low = Math.min(...points.map(p => p.price));
    const high = Math.max(...points.map(p => p.price));
    const padding = Math.max((high-low)*0.15, high*0.0001);
    const bottom=low-padding, top=high+padding;
    const start=points[0].time, duration=Math.max(time-start,60000);
    const coords=points.map(p => [14+(p.time-start)/duration*572, 160-(p.price-bottom)/(top-bottom)*140]);
    const path=coords.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ');
    node('mini-price-line').setAttribute('d',path);
    const last=coords[coords.length-1];
    node('mini-price-dot').setAttribute('cx',last[0]);
    node('mini-price-dot').setAttribute('cy',last[1]);
    node('mini-price-dot').setAttribute('visibility','visible');
    node('mini-price-current').textContent=priceLabel(price);
    node('mini-price-range').textContent='Low '+priceLabel(low)+' · High '+priceLabel(high);
    node('mini-price-times').textContent=new Date(start).toLocaleTimeString()+' — '+new Date(time).toLocaleTimeString();
    node('mini-price-status').textContent=points.length===1 ? 'First price recorded. The next update will add another point.' : points.length+' observations · Last update '+new Date(time).toLocaleTimeString();
    node('mini-price-svg').setAttribute('aria-label','MONKY price during this visit. Current '+priceLabel(price)+'. '+points.length+' observations.');
  });
  window.addEventListener('monky-price-unavailable', () => {
    node('mini-price-status').textContent=points.length?'Update unavailable. Chart shows previously recorded prices.':'Waiting for a valid MONKY price.';
  });
})();
