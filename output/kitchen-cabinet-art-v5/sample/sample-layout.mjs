// Measure the layout viewport, which remains stable when a mobile browser resizes.
// innerWidth can include transformed overflow during a wide-to-narrow resize.
function fit(){const root=document.documentElement;root.style.setProperty('--art-scale',Math.min(root.clientWidth/375,root.clientHeight/667,1.35));}
fit();addEventListener('resize',fit);new ResizeObserver(fit).observe(document.documentElement);
