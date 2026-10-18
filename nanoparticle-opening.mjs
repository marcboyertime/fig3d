import {ease} from './nanoparticle-state.mjs?v=20261016-1';
// Dwell times include time to orient to the image as well as read the caption.
// Camera travel occupies only part of each beat; the rest is a still inspection.
const BEATS = [
 {duration:8,copy:['FROM THE PAPER','A surface has its own structure','Different shapes expose different crystal faces. Start with two images of gold nanoparticles.']},
 {duration:8,copy:['RECOGNIZE THE GEOMETRY','Squares and triangles','The outline of a face is a clue to the arrangement of atoms beneath it.']},
 {duration:12,copy:['ENTER THE MODEL','Both faces, one crystal','This ideal gold cuboctahedron combines square and triangular faces. It is an explanatory model, not a reconstruction of either image.']},
 {duration:9,site:'face',copy:['ATOMIC SURROUNDINGS','A face atom has company','Neighbors on the terrace and underneath it surround this atom. The open side faces the outside.']},
 {duration:8,site:'edge',copy:['ATOMIC SURROUNDINGS','At an edge, fewer neighbors','Two terraces meet. The local surroundings open out in more than one direction.']},
 {duration:9,site:'corner',copy:['ATOMIC SURROUNDINGS','A corner opens further','Two square and two triangular faces meet at this corner. Only five neighbors remain.']},
];
// In layout v2 (the default; ?layout=v1 keeps the earlier layout) the figure has its own column beside an empty stage, and
// the outlines lift off it after about 7 s, as on every page (owner decision 8): the first two beats are 3.5 s each there.
// Their words stay in the first step, beside the figure they describe.
const V2=typeof document!=='undefined'&&document.documentElement.classList.contains('layout-v2');
export const OPENING_BEATS = V2?BEATS.map((b,i)=>i<2?{...b,duration:3.5}:b):BEATS;
export const OPENING_STARTS=OPENING_BEATS.map((_,i)=>OPENING_BEATS.slice(0,i).reduce((sum,b)=>sum+b.duration,0));
export const OPENING_END=OPENING_BEATS.reduce((sum,b)=>sum+b.duration,0);
export function openingPhase(seconds){return OPENING_STARTS.reduce((phase,start,i)=>seconds>=start?i:phase,0);}
// The lift from paper to model moves only in these intervals: the outlines draw onto the icons, then the paper lies back and the atoms resolve.
// Between them the picture holds still, so skipping a hold changes nothing on screen.
export const LIFT_SEGMENTS=[[OPENING_STARTS[1],OPENING_STARTS[1]+2.5],[OPENING_STARTS[2],OPENING_STARTS[2]+5.5]];
export const LIFT_END=LIFT_SEGMENTS[1][1];
// The lift's clock runs only while the stage is on screen. A press with the stage out of view lands the lift at once, so the controls
// show the reader's choice immediately instead of waiting for the stage to be scrolled back.
export const liftPlays=(seconds,onStage)=>!!onStage&&seconds<LIFT_END;
// The hull holds for three seconds of the model beat, then fades over two and a half.
export function hullOpacity(seconds){const t=seconds-OPENING_STARTS[2];return t<3?1:1-ease((t-3)/2.5);}
// The hull dissolves into atoms: every atom is drawn at this share of its size, so the atoms grow exactly as the hull fades
// and never switch on at full size in one frame.
export const growth=hull=>Math.min(1,Math.max(0,1-hull));
// Explore or any early input plays the rest of the lift at three times speed instead of cutting to the model.
export function fastForward(seconds,dt,rate=3){let left=dt*rate;for(const [a,b] of LIFT_SEGMENTS){if(seconds<a)seconds=a;if(seconds<b){const step=Math.min(left,b-seconds);seconds+=step;left-=step;if(left<=0)return seconds;}}return Math.max(seconds,LIFT_END);}
