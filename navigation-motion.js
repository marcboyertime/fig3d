// Native same-origin transitions preserve real links, history and new-tab behavior.
// The state attribute permits checking that a real transition ran, rather than only CSS support.
addEventListener('pagereveal',event=>{
 const root=document.documentElement,transition=event.viewTransition;
 root.dataset.navigationMotion='none';
 if(!transition)return;
 // Its promises are handled here, so a skip (reduced motion below, or the staged opening on a first visit) is never logged
 // as an uncaught error.
 transition.ready.then(()=>{root.dataset.navigationMotion='running'}).catch(()=>{if(root.dataset.navigationMotion!=='reduced')root.dataset.navigationMotion='skipped'});transition.updateCallbackDone?.catch(()=>{});
 const flags=new URLSearchParams(location.search);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches||flags.has('reduced')||flags.get('motion')==='reduce'){transition.skipTransition();root.dataset.navigationMotion='reduced';return;}
 transition.finished.then(()=>{if(root.dataset.navigationMotion==='running')root.dataset.navigationMotion='finished'});
});
