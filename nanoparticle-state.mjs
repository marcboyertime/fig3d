import {createParticle,representative,bindingSites} from './nanoparticle-model.mjs?v=20261016-1';
export const VIEWS=['surfaces','neighbors','size','binding'];
// The paper-to-model tour plays only when the shared first-visit opening ran on this load (first visit, or ?opening),
// and never with reduced motion. Later visits, deep links and ?no-opening start in the explorer.
export function initialState(reduced=false,opening=true){return {model:createParticle(6),view:'surfaces',faceId:'100:1,0,0',selected:null,site:'atop',cutaway:false,cutSide:1,stacking:false,intro:opening&&!reduced,paused:false,reduced};}
// ?reduced is the review alias for reduced motion; ?motion=reduce is the older spelling.
export function reducedFromSearch(search){const p=new URLSearchParams(search);return p.has('reduced')||p.get('motion')==='reduce';}
// The cut hides the half that holds the chosen atom, so nothing on that side covers it or its neighbors.
// An atom on the cut plane is exposed by either half, so the cut stays where it is.
const cutSide=(m,id,side=1)=>{const a=m.byId.get(id),s=a?a.p[0]+a.p[1]+a.p[2]:0;return s<0?-1:s>0?1:side;};
// Explore, at any moment of the tour, lands where the full tour ends: the corner atom and its neighbors.
export function landing(state){return reduce(state,{type:'intro',patch:{view:'neighbors',selected:representative(state.model,'corner').id,cutaway:false,stacking:false}});}
export function reduce(state,action){
 const next={...state};
 if(action.type!=='pause'&&action.type!=='intro'){next.intro=false;next.paused=false;}
 switch(action.type){
 case 'intro':return {...next,...action.patch};
 case 'pause':next.paused=!state.paused;break;
 case 'explore':break;
 case 'view':if(!VIEWS.includes(action.value))return state;next.view=action.value;next.cutaway=false;next.stacking=false;if(next.view==='neighbors'&&!next.selected)next.selected=representative(next.model,'face',next.faceId).id;break;
 case 'face':if(!next.model.facets.some(f=>f.id===action.value))return state;next.faceId=action.value;next.selected=null;next.site='atop';next.stacking=false;next.cutaway=false;break;
 case 'atom':if(!next.model.byId.has(action.value))return state;next.selected=action.value;next.view='neighbors';if(next.cutaway)next.cutSide=cutSide(next.model,next.selected,state.cutSide);break;
 case 'shortcut':next.selected=representative(next.model,action.value,next.faceId).id;next.view='neighbors';next.cutaway=action.value==='interior';next.cutSide=cutSide(next.model,next.selected);next.stacking=false;break;
 case 'shells':next.model=createParticle(action.value);next.selected=state.selected&&next.model.byId.has(state.selected)?state.selected:null;next.cutaway=false;next.stacking=false;break;
 case 'cutaway':next.cutaway=!state.cutaway;if(next.cutaway)next.cutSide=cutSide(next.model,next.selected,state.cutSide);break;
 case 'site':if(!(action.value in bindingSites(next.model,next.faceId)))return state;next.site=action.value;next.stacking=false;break;
 case 'stacking':next.stacking=!state.stacking;break;
 case 'reset':return {...initialState(state.reduced),intro:false};
 default:throw new Error('Unknown action '+action.type);
 }
 return next;
}
export const ease=t=>{t=Math.min(1,Math.max(0,t));return t*t*t*(t*(t*6-15)+10);};
// Camera yaw decreases as the pointer moves right: a near-side landmark follows the hand.
export function orbitDelta(pose,dx,dy){return {...pose,yaw:pose.yaw-dx*.006,elevation:Math.max(-1.16,Math.min(1.16,pose.elevation+dy*.006))};}
// A press turns the particle once it has moved clearly from where it started: 6 px with a mouse, however slowly, so a slow drag is never a tap.
// A touch stroke stays the page's until it has moved 16 px (past the browser's own scroll slop) and more sideways than up or down:
// a stroke at least as vertical as it is sideways scrolls the page and never counts as input on the stage.
export function gesture(dx,dy,touch=false){return Math.hypot(dx,dy)<=(touch?16:6)?'wait':touch&&Math.abs(dy)>=Math.abs(dx)?'page':'turn';}
// While the lift plays the stage still shows the tour, so the controls and the scene keep the tour's state (held) and the reader's
// choice appears when the lift ends. Pause and reduced motion pass through at once, so a camera move in flight still pauses.
export const display=(state,held)=>held?{...held,paused:state.paused,reduced:state.reduced}:state;

// The reader's view as address fields (site/view-state.mjs): the particle size first (it rebuilds the model), then the face,
// the view, the binding site or chosen atom on the views they belong to, and the two cut-away toggles.
export const VIEW=[
 {key:'size',get:s=>s.model.shells,act:v=>Number.isInteger(v)&&v>=3&&v<=10?{type:'shells',value:v}:null,parse:t=>t===''?NaN:+t},
 {key:'face',get:s=>s.faceId,act:v=>({type:'face',value:v})},
 {key:'view',get:s=>s.view,act:v=>VIEWS.includes(v)?{type:'view',value:v}:null},
 {key:'site',get:s=>s.site,when:s=>s.view==='binding',act:v=>({type:'site',value:v})},
 {key:'atom',get:s=>s.selected,when:s=>s.view==='neighbors',act:v=>({type:'atom',value:v}),parse:t=>t===''?NaN:(/^\d+$/.test(t)?+t:t)},
 {key:'cutaway',get:s=>s.cutaway,act:(v,s)=>v!==s.cutaway?{type:'cutaway'}:null,parse:t=>t==='1',format:v=>v?'1':'0'},
 {key:'stacking',get:s=>s.stacking,when:s=>s.view==='binding',act:(v,s)=>v!==s.stacking?{type:'stacking'}:null,parse:t=>t==='1',format:v=>v?'1':'0'},
];
