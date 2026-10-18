// On phones the visual comes first (owner decision 5, 16 October 2026): an element marked data-phone-after="<selector>"
// (the page's primer) moves to just after that element (the explorer or the film) below 861 px, and back to its own
// place on wider screens, where the primer still comes before the visual. The elements themselves move, so the reading
// order for a screen reader matches what is seen. A classic script included right after the visual, so it runs before
// the page is first painted and nothing jumps; it also follows a window that crosses the breakpoint.
(function(){
 const phone=matchMedia('(max-width: 860px)');
 const moves=[...document.querySelectorAll('[data-phone-after]')].map(el=>{
  const after=document.querySelector(el.dataset.phoneAfter),home=document.createComment('phone-order: primer home');
  if(!after)return null;el.before(home);return {el,after,home};
 }).filter(Boolean);
 function place(){
  for(const m of moves){
   if(phone.matches){if(m.after.nextElementSibling!==m.el)m.after.after(m.el);}
   else if(m.home.nextSibling!==m.el)m.home.after(m.el);
  }
  document.documentElement.classList.toggle('phone-order',phone.matches&&moves.length>0);
 }
 place();phone.addEventListener('change',place);
})();
