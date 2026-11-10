(() => {
  'use strict';
  const hero = document.querySelector('.material-hero');
  if (!hero) return;
  const wrap = hero.querySelector('.material-word-wrap');
  const title = hero.querySelector('.material-title');
  const canvas = hero.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const buttons = [...hero.querySelectorAll('[data-material]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sources = [
    'assets/ernan/materials/ernan-pistachio-pastry-v2.png',
    'assets/ernan/materials/ernan-croissant-v1.png',
    'assets/ernan/materials/ernan-lemonade-v1.png',
    'assets/ernan/materials/ernan-coffee-v1.png',
    'assets/ernan/materials/ernan-ravioli-v1.png'
  ];
  const images = sources.map(src => { const img = new Image(); img.src = src; return img; });
  const sheet = () => document.createElement('canvas');
  const base = sheet(), unionMask = sheet(), scratch = sheet(), effect = sheet();
  const art = sources.map(sheet);
  const allCanvases = [canvas, base, unionMask, scratch, effect, ...art];
  let glyphs = [], glyphCache = [], groups = [], stroke = null, frame = 0, width = 0, height = 0, dpr = 1;
  let active = 0, next = 0, preview = false, previous = null, loaded = false;
  const holdMs = 1200, dissolveMs = 2400;
  const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
  const choice = index => {
    active = index;
    buttons.forEach((b,i) => b.setAttribute('aria-pressed', String(i === index)));
  };
  const resetContext = target => {
    const c = target.getContext('2d');
    c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,target.width,target.height);
    c.setTransform(dpr,0,0,dpr,0,0); return c;
  };
  // Extract only alpha bounds, so material glyphs align with the real site font.
  // Original PNGs are never modified. Empty margins and small crumbs are ignored.
  function findGlyphs(img) {
    const scan = sheet(); scan.width = img.naturalWidth; scan.height = img.naturalHeight;
    const c = scan.getContext('2d',{willReadFrequently:true}); c.drawImage(img,0,0);
    const {data} = c.getImageData(0,0,scan.width,scan.height);
    const columns = [];
    for (let x=0;x<scan.width;x++) {
      let count = 0;
      for (let y=0;y<scan.height;y++) if (data[(y*scan.width+x)*4+3]>110) count++;
      columns[x] = count > scan.height*.12;
    }
    const runs = []; let start = -1;
    for (let x=0;x<=scan.width;x++) {
      if (columns[x] && start<0) start=x;
      if (!columns[x] && start>=0) { if (x-start>scan.width*.055) runs.push({x:start,w:x-start}); start=-1; }
    }
    let ranges = runs;
    if (runs.length !== 5) {
      const first = columns.indexOf(true), last = columns.lastIndexOf(true), step = (last-first+1)/5;
      ranges = Array.from({length:5},(_,i)=>({x:first+i*step,w:step}));
    }
    return ranges.map(r => {
      let y0=scan.height, y1=0;
      for (let x=Math.floor(r.x);x<Math.min(scan.width,Math.ceil(r.x+r.w));x++) for(let y=0;y<scan.height;y++) {
        if(data[(y*scan.width+x)*4+3]>110) { y0=Math.min(y0,y);y1=Math.max(y1,y); }
      }
      return {x:r.x,y:y0,w:r.w,h:y1-y0+1};
    });
  }
  function build() {
    if (!loaded) return;
    const rect=wrap.getBoundingClientRect(); width=rect.width; height=rect.height;
    dpr=Math.min(devicePixelRatio||1,1.5);
    allCanvases.forEach(c=>{c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);});
    const b=resetContext(base), style=getComputedStyle(title), size=parseFloat(style.fontSize);
    b.font=`400 ${size}px "Ernan Display"`; b.textBaseline='alphabetic';
    const letters=[...'ERNAN'], metrics=letters.map(letter=>b.measureText(letter)), tracking=-size*.035;
    const total=metrics.reduce((n,m)=>n+m.width,0)+tracking*4;
    const ascent=Math.max(...metrics.map(m=>m.actualBoundingBoxAscent));
    const descent=Math.max(...metrics.map(m=>m.actualBoundingBoxDescent));
    const baseline=(height-ascent-descent)/2+ascent;
    let x=(width-total)/2;
    b.fillStyle=getComputedStyle(hero).color;
    glyphs=letters.map((letter,i)=>{
      const m=metrics[i]; b.fillText(letter,x,baseline);
      const g={x:x-m.actualBoundingBoxLeft,y:baseline-m.actualBoundingBoxAscent,w:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,h:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent};
      x+=m.width+tracking; return g;
    });
    art.forEach((a,index)=>{
      const c=resetContext(a);
      glyphs.forEach((g,i)=>{
        const s=glyphCache[index][i];
        c.drawImage(images[index],s.x,s.y,s.w,s.h,g.x-1.5,g.y-1.5,g.w+3,g.h+3);
      });
    });
    groups=[];stroke=null;previous=null;hero.classList.add('material-ready'); render(performance.now());
  }
  function blob(c,p,alpha) {
    const r=p.r, count=20;
    c.globalAlpha=alpha; c.beginPath();
    for(let i=0;i<=count;i++) {
      const a=i/count*Math.PI*2;
      const radius=r*(1+.065*Math.sin(a*3+p.seed)+.045*Math.cos(a*7-p.seed));
      const x=p.x+Math.cos(a)*radius, y=p.y+Math.sin(a)*radius*.88;
      if(i===0)c.moveTo(x,y); else c.lineTo(x,y);
    }
    c.closePath();c.fill();
  }
  function render(now) {
    if(frame) { cancelAnimationFrame(frame);frame=0; }
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(base,0,0);
    if(preview) { ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(art[active],0,0);return; }
    groups=groups.filter(g=>reduced.matches || now-g.time<holdMs+dissolveMs);
    if(!groups.length)return;
    groups.forEach(g=>{
      const t=clamp((now-g.time-holdMs)/dissolveMs,0,1);
      const fade=reduced.matches?1:1-t*t*t*(t*(t*6-15)+10);
      // Make each gesture's brush mask opaque first, then fade that completed
      // gesture once. Overlapping stamps cannot accumulate alpha and pop out.
      const mask=resetContext(unionMask);mask.fillStyle='#000';
      g.points.forEach(p=>blob(mask,p,1));mask.globalAlpha=1;
      const e=resetContext(effect);e.setTransform(1,0,0,1,0,0);e.drawImage(canvas,0,0);
      e.globalCompositeOperation='destination-out';e.drawImage(unionMask,0,0);
      e.globalCompositeOperation='source-over';
      const s=resetContext(scratch);s.setTransform(1,0,0,1,0,0);s.drawImage(art[g.material],0,0);
      s.globalCompositeOperation='destination-in';s.drawImage(unionMask,0,0);s.globalCompositeOperation='source-over';
      e.drawImage(scratch,0,0);
      // Complementary premultiplied layers keep the text opaque throughout
      // the dissolve. A new gesture does not revive an older, fading trail.
      ctx.globalCompositeOperation='destination-in';ctx.globalAlpha=1-fade;
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade;ctx.drawImage(effect,0,0);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    });
    if(!reduced.matches)frame=requestAnimationFrame(render);
  }
  function paint(event) {
    if(!loaded)return;
    preview=false;
    const rect=wrap.getBoundingClientRect(), x=event.clientX-rect.left,y=event.clientY-rect.top;
    const radius=clamp(height*.25,28,100), now=performance.now();
    if(reduced.matches) { groups=[];stroke=null; }
    if(!stroke || now-stroke.time>holdMs || stroke.material!==active) {
      stroke={material:active,time:now,points:[]};groups.push(stroke);groups=groups.slice(-6);previous=null;
    }
    stroke.time=now;
    const distance=previous?Math.hypot(x-previous.x,y-previous.y):0;
    if(previous && distance<radius*.16) { render(now);return; }
    const steps=previous?Math.min(12,Math.max(1,Math.ceil(distance/(radius*.28)))):1;
    for(let i=1;i<=steps;i++) {
      const f=i/steps;
      stroke.points.push({x:previous?previous.x+(x-previous.x)*f:x,y:previous?previous.y+(y-previous.y)*f:y,r:radius,seed:x*.015+y*.01});
    }
    stroke.points=stroke.points.slice(-240);previous={x,y};render(now);
  }
  wrap.addEventListener('pointerenter',event=>{
    previous=null;stroke=null;
    if(event.pointerType!=='touch') {choice(next);next=(next+1)%sources.length;paint(event);}
  });
  wrap.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch') {choice(next);next=(next+1)%sources.length;previous=null;stroke=null;paint(event);}
  });
  wrap.addEventListener('pointermove',paint,{passive:true});
  const leave=()=>{previous=null;stroke=null;if(reduced.matches){groups=[];render(performance.now());}};
  wrap.addEventListener('pointerleave',leave);wrap.addEventListener('pointercancel',leave);
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{choice(i);next=i;groups=[];stroke=null;preview=true;render(performance.now());}));
  let resizeFrame=0;
  new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(build);}).observe(wrap);
  new MutationObserver(()=>build()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){groups=[];stroke=null;if(frame)cancelAnimationFrame(frame);frame=0;}});
  reduced.addEventListener('change',()=>{groups=[];stroke=null;render(performance.now());});
  Promise.all([document.fonts.ready,...images.map(img=>img.decode())]).then(()=>{
    glyphCache=images.map(findGlyphs);loaded=true;build();
  }).catch(error=>{console.warn('Material lettering unavailable; keeping the readable wordmark.',error);});
})();
