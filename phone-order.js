// The visual comes first: an element marked data-phone-after="<selector>" (the page's primer) moves to just after that
// element (the explorer or the film). On phones since owner decision 5 (16 October 2026); in layout v2 at every width
// since 9 November 2026 ("not overwhelming at all": a page opens on its question, the figure and the model, and the
// background reading follows the walk-through). Only ?layout=v1 on a wide screen keeps the primer before the visual.
// The elements themselves move, so the reading order for a screen reader matches what is seen. A classic script
// included right after the visual, so it runs before the page is first painted and nothing jumps; it also follows a
// window that crosses the breakpoint.
(function(){
 const phone=matchMedia('(max-width: 860px)'),v2=document.documentElement.classList.contains('layout-v2');
 const moves=[...document.querySelectorAll('[data-phone-after]')].map(el=>{
  const after=document.querySelector(el.dataset.phoneAfter),home=document.createComment('phone-order: primer home');
  if(!after)return null;el.before(home);return {el,after,home};
 }).filter(Boolean);
 function place(){
  for(const m of moves){
   if(phone.matches||v2){if(m.after.nextElementSibling!==m.el)m.after.after(m.el);}
   else if(m.home.nextSibling!==m.el)m.home.after(m.el);
  }
  document.documentElement.classList.toggle('phone-order',phone.matches&&moves.length>0);
  document.documentElement.classList.toggle('visual-first',(phone.matches||v2)&&moves.length>0);
 }
 place();phone.addEventListener('change',place);
})();
