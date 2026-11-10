// Anchored annotations shared by every visual on the site.
// A callout is a small ring or pin on the thing it names, a hairline that bends into a short shelf, and a title with
// an optional one-line explanation. The ring is redrawn on its anchor every frame, so a callout rides a moving ion,
// a turning model or a growing front; the text block eases when it has to change side.
//
//   const notes = new Annotations(stageElement);
//   notes.show([{id:'li', title:'Lithium ion', note:'Leaves graphite', tone:'#89fcd8', at:()=>({x,y,r}), dir:[1,-.6]}]);
//   notes.frame();   // optional: call after the page renders so rings never lag the picture by a frame
//
// Spec fields
//   id        stable key; showing the same id again keeps the callout in place and swaps its text if it changed
//   title     short name of the thing (required); note: one short line saying what it does or why it matters
//   at()      anchor in stage pixels: {x,y} plus optional r (ring radius around the object) and visible:false
//   dir       preferred direction from anchor to text, [dx,dy] in screen space (or a function returning it); dist: extra reach in px
//   tone      CSS colour of ring, line and title
//   fade()    optional 0..1 multiplier the page controls (for example a camera transition): followed exactly while it
//             changes gradually, eased when it jumps (a 0/1 switch)
//   phone     false hides it when the stage is narrow; 'note' keeps its note there too
//   home()    optional fixed point for the words; the line then swings to follow a moving anchor
//   priority  lower places first and wins collisions (default: order given)
//   live      text that follows a slider: swap it without the blur
//   onSelect  makes the text a button (hover previews, click pins); select(id) marks one as pressed
//   pick      candidate index taken when the callout appears instead of the best-scoring one (0 is dir itself), for a page
//             that planned one side over a whole path
// Options: className 'is-plated' sets the words on a small dark glass plate, for scenes too busy for a halo alone.
// avoid() returns circles {x,y,r} or rects {x,y,w,h} the words should stay off (usually the model itself); hard:true on a
// circle makes it as costly as covering the thing being named. reduced: a {matches} source for reduced motion (default:
// the OS setting or the ?reduced / ?motion=reduce review aliases every page reads).
// The first callouts wait for the page's staged opening to finish and for any of the stage to be on screen.
// frame() and layout() may run as often as the page likes: each callout keeps its own clock, so fades and draw-ins take the
// same time however many callers place it in a frame.
const SVG='http://www.w3.org/2000/svg';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>1-Math.pow(1-clamp(t,0,1),3),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)'),SWITCH=320,EXTRA=8;
const flags=new URLSearchParams(globalThis.location?.search||''),reviewReduced=flags.has('reduced')||flags.get('motion')==='reduce';
const motion={get matches(){return reviewReduced||reducedQuery.matches;}};

export class Annotations{
  constructor(stage,options={}){
    this.stage=stage;this.options={compactWidth:560,stagger:260,...options};this.reduced=options.reduced||motion;
    this.items=new Map();this.order=[];this.pending=null;this.selected=null;this.raf=0;this.visible=true;
    this.layer=document.createElement('div');this.layer.className='fig-ann';
    this.svg=document.createElementNS(SVG,'svg');this.svg.setAttribute('aria-hidden','true');this.layer.append(this.svg);
    if(options.className)this.layer.classList.add(...options.className.split(' '));
    stage.append(this.layer);
    this.resize();new ResizeObserver(()=>{this.resize();this.kick();}).observe(stage);
    // Wait for the staged opening, then for the stage to be seen, so the first callouts draw in where the reader is looking.
    const opening=window.Fig3DOpening?.done||Promise.resolve();
    this.gate=new Promise(resolve=>{
      opening.then(()=>{
        // Any of the stage on screen, as for the openings: a tall stage low in the first screen never shows a third of itself.
        const io=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>0)){io.disconnect();setTimeout(resolve,options.gateDelay??350);}},{threshold:0});
        io.observe(stage);
      });
    });
    this.ready=false;this.gate.then(()=>{this.ready=true;if(this.pending){const p=this.pending;this.pending=null;this.show(...p);}});
    new IntersectionObserver(entries=>{this.visible=entries.some(e=>e.isIntersecting);if(this.visible)this.kick();},{rootMargin:'120px'}).observe(stage);
  }
  get compact(){return this.width<this.options.compactWidth;}
  // An element's box in this layer's own pixels, where at() and avoid() place things, plus pad on each side, whatever the
  // layer's transform on screen (a stage drawn shifted or folded, kit/layout-v2.mjs): for the stage's buttons the words avoid.
  rect(el,pad=0){
    const l=this.layer.getBoundingClientRect(),k=this.layer.offsetWidth?l.width/this.layer.offsetWidth:1,r=el.getBoundingClientRect();
    return {x:(r.left-l.left)/k-pad,y:(r.top-l.top)/k-pad,w:r.width/k+2*pad,h:r.height/k+2*pad};
  }
  resize(){
    const r=this.stage.getBoundingClientRect();this.width=r.width;this.height=r.height;
    this.svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
    this.layer.classList.toggle('is-compact',this.compact);
    for(const item of this.items.values())item.measured=false;
  }
  // Replace the set of callouts. Callouts already showing stay where they are; new ones draw in one after another
  // (with reduced motion, all at once).
  show(specs,{stagger=this.options.stagger,delay=0}={}){
    specs=specs.filter(Boolean);
    if(!this.ready){this.pending=[specs,{stagger,delay}];return;}
    if(this.reduced.matches)stagger=delay=0;
    const now=performance.now(),keep=new Set(specs.map(s=>s.id));
    for(const [id,item] of this.items)if(!keep.has(id))item.leaving=true;
    let n=0;
    specs.forEach((spec,i)=>{
      let item=this.items.get(spec.id);
      if(item&&!item.removed){
        item.leaving=false;
        // New words are written by the next layout: in place with a soft swap, or, when the anchor jumps with them (one id
        // reused for another object), only once the old words have faded out at the old place.
        if(item.spec.title!==spec.title||item.spec.note!==spec.note){item.spec=spec;if(spec.live){item.rewrite=false;this.write(item,false);}else item.rewrite=true;}else item.spec=spec;
      }else{
        item=this.create(spec);item.start=now+delay+(n++)*stagger;
      }
      item.priority=spec.priority??i;
    });
    this.order=[...this.items.values()];this.kick();
  }
  hide(){this.show([]);}
  select(id){this.selected=id;for(const item of this.items.values())item.label.setAttribute?.('aria-pressed',String(item.spec.id===id));}
  create(spec){
    const g=document.createElementNS(SVG,'g'),lead=document.createElementNS(SVG,'path'),ring=document.createElementNS(SVG,'circle'),pin=document.createElementNS(SVG,'circle');
    g.setAttribute('class','fig-ann-mark');g.dataset.ann=spec.id;lead.setAttribute('class','lead');lead.setAttribute('pathLength','1');ring.setAttribute('class','ring');pin.setAttribute('class','pin');
    g.append(lead,ring,pin);this.svg.append(g);
    const label=document.createElement(spec.onSelect?'button':'div');label.className='fig-ann-label';label.dataset.ann=spec.id;
    if(spec.onSelect){
      label.type='button';label.setAttribute('aria-pressed','false');
      label.addEventListener('pointerenter',()=>spec.onSelect(spec.id,false));label.addEventListener('pointerleave',()=>spec.onSelect(null,false));
      label.addEventListener('focus',()=>spec.onSelect(spec.id,false));label.addEventListener('blur',()=>spec.onSelect(null,false));
      label.addEventListener('click',()=>item.spec.onSelect(item.spec.id,true));
    }
    label.innerHTML='<b></b><span></span>';
    // Nothing is painted until the first layout places it: a callout made inside another animation frame would otherwise
    // show its words at full strength in the stage's top-left corner for a frame.
    g.style.display='none';label.style.visibility='hidden';label.style.opacity='0';this.layer.append(label);
    const item={spec,g,lead,ring,pin,label,p:0,vis:0,off:null,choice:null,measured:false,leaving:false,start:0};
    this.items.set(spec.id,item);this.write(item,false);return item;
  }
  write(item,swap){
    const {spec,label}=item;label.querySelector('b').innerHTML=spec.title;const note=label.querySelector('span');note.innerHTML=spec.note||'';note.hidden=!spec.note;
    label.dataset.phone=spec.phone===false?'no':spec.phone==='note'?'note':'title';
    if(spec.onSelect)label.setAttribute('aria-label',spec.label||label.textContent);
    const tone=spec.tone||'#d1defe';item.g.style.setProperty('--tone',tone);label.style.setProperty('--tone',tone);
    item.measured=false;
    if(swap&&!this.reduced.matches){label.classList.remove('is-swap');void label.offsetWidth;label.classList.add('is-swap');}
  }
  // Size of the words. On a plate the box closes on the lines themselves, so a balanced two-line note leaves no empty band.
  measure(item){
    const L=item.label;
    if(this.layer.classList.contains('is-plated')){
      L.style.width='';const range=document.createRange(),walk=document.createTreeWalker(L,NodeFilter.SHOW_TEXT);let lo=Infinity,hi=-Infinity;
      for(let t=walk.nextNode();t;t=walk.nextNode()){range.selectNodeContents(t);for(const q of range.getClientRects())if(q.width){lo=Math.min(lo,q.left);hi=Math.max(hi,q.right);}}
      const cs=getComputedStyle(L),pad=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+parseFloat(cs.borderLeftWidth)+parseFloat(cs.borderRightWidth),inner=L.offsetWidth-pad,text=(hi-lo)/(L.getBoundingClientRect().width/L.offsetWidth||1);
      if(hi>lo&&text<inner-2)L.style.width=Math.ceil(text+1+(cs.boxSizing==='border-box'?pad:0))+'px';
    }else if(L.style.width)L.style.width='';
    item.w=L.offsetWidth;item.h=L.offsetHeight;const b=L.querySelector('b');item.titleMid=b.offsetTop+b.offsetHeight/2;item.measured=true;
  }
  remove(item){item.g.remove();item.label.remove();item.removed=true;this.items.delete(item.spec.id);}
  kick(){if(!this.raf&&this.visible)this.raf=requestAnimationFrame(t=>{this.raf=0;this.tick(t);});}
  tick(t){
    const busy=this.layout(t);
    // Keep running while anything is shown: anchors may move without the page telling us.
    if(this.items.size&&(busy||this.order.length))this.kick();
  }
  frame(){this.layout(performance.now());}
  // Places every callout for this moment. Time steps come from each callout's own clock; a second argument is ignored.
  layout(now){
    const W=this.width,H=this.height;if(!W||!H)return false;
    const reduced=this.reduced.matches,compact=this.compact,margin=compact?8:12,placed=[],anchors=[];let busy=false;
    const avoid=(this.options.avoid?.()||[]).filter(Boolean);
    const list=[...this.items.values()].sort((a,b)=>a.priority-b.priority);
    // Anchors first, so a text block can avoid sitting on someone else's ring.
    for(const item of list){
      // An anchor that is lost (an object removed, a callout leaving with it) keeps its last place while the callout fades.
      const a=item.spec.at?.(),ok=a&&Number.isFinite(a.x)&&Number.isFinite(a.y);item.a=ok?a:item.a&&item.vis*item.fv>.01?{x:item.a.x,y:item.a.y,r:item.a.r,visible:false}:null;
      const hiddenOnPhone=compact&&item.spec.phone===false;
      item.f=item.spec.fade?clamp(item.spec.fade(),0,1):1;item.fv??=item.f;
      item.want=!item.leaving&&!hiddenOnPhone&&item.a&&item.a.visible!==false?1:0;
      if(item.a&&item.want&&item.f>.02)anchors.push(item);
    }
    for(const item of list){
      // The callout's own clock: a page calling frame() after its render and tick() in the same frame advance it once, and a
      // zero step never completes a fade (a leaving or hidden callout fades, it is not cut).
      const step=Math.min(64,Math.max(0,now-(item.clock??now)));item.clock=Math.max(item.clock??now,now);
      // Appearance: the ring opens, the hairline draws out, then the words arrive.
      if(now>=item.start&&!item.leaving&&item.p<1){item.p=reduced?1:Math.min(1,item.p+step/760);busy=true;}
      const k=reduced?1:1-Math.exp(-step/(item.leaving?120:160));
      const before=item.vis;item.vis+=(item.want*(now>=item.start?1:0)-item.vis)*k;if(Math.abs(item.vis-before)>.001)busy=true;
      // The page's fade() is followed exactly while it moves gradually (a camera-timed fade keeps its own pace); a jump in
      // it (a 0/1 switch) is eased like an arrival or a departure, never cut.
      {const d=item.f-item.fv;if(reduced||Math.abs(d)<=Math.max(step,16)/90)item.fv=item.f;else{item.fv+=d*(1-Math.exp(-step/(d<0?120:160)));busy=true;}}
      if(item.leaving&&item.vis<.01){this.remove(item);continue;}
      const e=item.vis*item.fv,shown=e>.01&&item.a;
      item.g.style.display=shown?'':'none';item.label.style.visibility=shown?'':'hidden';
      if(!shown){if(item.rewrite){item.rewrite=false;this.write(item,false);}item.wasHidden=true;item.prevA=null;item.sw=null;continue;}
      const spec=item.spec;
      // A jump of the anchor (a rider moving on to the next ion, a pin moving to another face) is never drawn as a
      // slide: the callout fades out where it was and fades back in at the new place.
      const live=item.a,prev=item.prevA;item.prevA={x:live.x,y:live.y,r:live.r};
      if(!reduced&&prev&&e>.02&&!item.sw&&Math.hypot(live.x-prev.x,live.y-prev.y)>Math.max(46,(live.r||0)*3))item.sw={t:now,from:prev,jump:true};
      let sf=1,a=live;
      if(item.sw){
        const u=clamp((now-item.sw.t)/SWITCH,0,1);busy=true;
        if(u<.5){sf=1-smooth(u*2);if(item.sw.from)a=item.sw.from;}
        else{sf=smooth(u*2-1);if(!item.sw.done){item.sw.done=true;item.choice=item.sw.next??null;if(item.rewrite){item.rewrite=false;this.write(item,false);}}}
        if(u>=1)item.sw=null;
      }
      // New words: with a jump they wait for its midpoint (above), so the old place never shows the new name.
      if(item.rewrite&&!(item.sw?.jump&&!item.sw.done)){item.rewrite=false;this.write(item,!reduced&&!item.wasHidden);}
      if(!item.measured)this.measure(item);
      const r=Math.max(0,a.r||0);
      // A callout with a home keeps its words near a fixed point while its line follows the moving anchor.
      const h=spec.home?.(),base=h&&Number.isFinite(h.x)&&Number.isFinite(h.y)?h:a,rb=base===a?r:0;
      let [dx,dy]=(typeof spec.dir==='function'?spec.dir():spec.dir)||[1,-.7];const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;
      const plated=this.layer.classList.contains('is-plated'),reach=(compact?18:26)+(spec.dist||0)*(compact?.7:1)+rb,shelf=compact?8:12,gap=plated?0:compact?5:6;
      const pinX=b=>clamp(b.x,margin,W-margin-b.w);
      const box=(ox,oy,side)=>{const ex=base.x+ox,ey=base.y+oy,x=side>0?ex+shelf+gap:ex-shelf-gap-item.w;return {ex,ey,x,y:ey-item.titleMid,w:item.w,h:item.h,side};};
      // The four far places are offered while the words must clear the model, and while a callout still holds one of them.
      const far=avoid.length||item.choice>=EXTRA||item.sw?.next>=EXTRA;
      const candidates=[[dx,dy],[-dx,dy],[dx,-dy],[-dx,-dy],[dx*1.8,dy*1.8],[-dx*1.8,dy*1.8],[dx,dy*.1],[-dx,dy*.1],...(far?[[dx*2.4,dy*1.6],[-dx*2.4,dy*1.6],[dx*1.4,dy*2.6],[-dx*1.4,dy*2.6]]:[])].map(([cx,cy])=>{
        const side=Math.abs(cx)<.12?(spec.side||1):Math.sign(cx);let b=box(cx*reach,cy*reach,side);
        // Slide vertically to stay inside the frame; the hairline absorbs the difference.
        const shift=clamp(b.y,margin,H-margin-b.h)-b.y;if(shift)b=box(cx*reach,cy*reach+shift,side);
        return b;
      });
      const score=b=>{
        let s=0;if(b.x<margin)s+=margin-b.x;if(b.x+b.w>W-margin)s+=b.x+b.w-W+margin;
        for(const o of placed){const ox=Math.min(b.x+b.w,o.x+o.w)-Math.max(b.x,o.x)+8,oy=Math.min(b.y+b.h,o.y+o.h)-Math.max(b.y,o.y)+6;if(ox>0&&oy>0)s+=ox*oy*.05+20;}
        // Keep the words off the model where there is room beside it: a small cost per pixel of overlap.
        for(const z of avoid){
          if(z.r){const nx=clamp(z.x,b.x,b.x+b.w),ny=clamp(z.y,b.y,b.y+b.h),d=z.r-Math.hypot(z.x-nx,z.y-ny);if(d>0){s+=d*.35+4;if(z.hard)s+=400;}}
          else{const ox=Math.min(b.x+b.w,z.x+z.w)-Math.max(b.x,z.x),oy=Math.min(b.y+b.h,z.y+z.h)-Math.max(b.y,z.y);if(ox>0&&oy>0)s+=ox*oy*.01+4;}
        }
        // Never cover the thing being named, also where words off the frame would be pinned inside it (below).
        {const rr=r+5,on=x=>Math.hypot(a.x-clamp(a.x,x,x+b.w),a.y-clamp(a.y,b.y,b.y+b.h))<rr;if(on(b.x)||on(pinX(b)))s+=400;}
        for(const o of anchors){if(o===item)continue;const p=o.a,rr=(p.r||3)+4;if(p.x>b.x-rr&&p.x<b.x+b.w+rr&&p.y>b.y-rr&&p.y<b.y+b.h+rr)s+=12;}
        return s;
      };
      const pick=()=>{let bi=0,bs=Infinity;candidates.forEach((c,i)=>{const v=score(c);if(v<bs-.01){bs=v;bi=i;}});return [bi,bs];};
      const first=()=>Number.isInteger(spec.pick)&&candidates[spec.pick]?spec.pick:pick()[0];
      // The side is chosen when the callout appears and then held: the words travel rigidly with their anchor.
      // Only a side that stays clearly bad (off frame, on another label) is changed, by a fade, never a slide.
      if(item.choice==null||item.wasHidden||!candidates[item.choice]){item.choice=first();item.bad=0;}
      else if(!item.sw){
        const now_=score(candidates[item.choice]);item.bad=now_>24?(item.bad||0)+step:0;
        if(item.bad>420){const [bi,bs]=pick();if(bi!==item.choice&&bs<now_*.5-4)item.sw={t:now,next:bi};item.bad=0;}
      }
      item.wasHidden=false;
      let target=candidates[item.choice]||candidates[0];
      // Out of frame horizontally even at its best: pin the text inside and let the line bend to it.
      if(target.x<margin||target.x+target.w>W-margin){const x=pinX(target),d=x-target.x;target={...target,x,ex:target.ex+d};}
      placed.push(target);
      const {ex,ey,x:lx,y:ly,side}=target;
      const sx=ex+side*shelf,ux=ex-a.x,uy=ey-a.y,len=Math.hypot(ux,uy)||1,start=r>0?r+2.5:3.4;
      const ax=a.x+ux/len*start,ay=a.y+uy/len*start;
      item.lead.setAttribute('d',len>start+2?`M${ax.toFixed(1)} ${ay.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}H${sx.toFixed(1)}`:`M${ex.toFixed(1)} ${ey.toFixed(1)}H${sx.toFixed(1)}`);
      const p=item.p,ringP=ease(p/.3),lineP=smooth((p-.12)/.5),textP=ease((p-.45)/.55);
      item.lead.style.strokeDashoffset=(1-lineP).toFixed(3);item.lead.style.opacity=item.sw&&!item.sw.jump?sf.toFixed(3):'';
      item.ring.setAttribute('cx',a.x.toFixed(1));item.ring.setAttribute('cy',a.y.toFixed(1));item.ring.setAttribute('r',((r>0?r+2.5:5.2)*(.6+.4*ringP)).toFixed(2));
      item.pin.setAttribute('cx',a.x.toFixed(1));item.pin.setAttribute('cy',a.y.toFixed(1));item.pin.setAttribute('r',r>0?0:(2.1*ringP).toFixed(2));
      item.g.style.opacity=(e*ringP*(item.sw?.jump?sf:1)).toFixed(3);item.g.classList.toggle('has-ring',r>0);
      const pressed=this.selected===spec.id;item.g.classList.toggle('is-pressed',pressed);
      item.label.style.opacity=(e*textP*sf).toFixed(3);
      // Sub-pixel placement so the words keep exact step with the ring when the anchor moves.
      item.label.style.transform=`translate3d(${(lx+(1-textP)*side*-6).toFixed(2)}px,${ly.toFixed(2)}px,0)`;
      item.label.classList.toggle('is-left',side<0);
      item.label.style.pointerEvents=spec.onSelect&&e*textP>.6?'auto':'none';
    }
    return busy;
  }
}

// Screen position of a three.js point inside a canvas of the given CSS size. visible is false behind the camera.
export function projectPoint(T,camera,point,width,height,radius=0){
  const v=point.clone().project(camera);const out={x:(v.x*.5+.5)*width,y:(-v.y*.5+.5)*height,visible:v.z<1&&v.z>-1};
  if(radius){
    // Screen radius of a sphere of this world radius at this point.
    const d=camera.position.distanceTo(point),f=height/(2*Math.tan((camera.fov||45)*Math.PI/360));
    out.r=camera.isOrthographicCamera?radius*height/(camera.top-camera.bottom)*camera.zoom:radius*f/d;
  }
  return out;
}

// Position of an SVG user-space point inside a stage element.
export function svgPoint(svg,x,y,stage){
  const m=svg.getScreenCTM();if(!m)return null;const s=stage.getBoundingClientRect();
  return {x:m.a*x+m.c*y+m.e-s.left,y:m.b*x+m.d*y+m.f-s.top};
}
