# Executed by build-kit.py with its SVG helpers; all parts remain text-free.
for family,w,h in [('shelf-card',120,116),('order-paper',112,104),('detail-paper',96,96)]:
 states=['default','selected','missing','locked','pressed'] if family!='detail-paper' else ['default','missing','empty']
 for state in states:
  fill={'default':'#fffaed','selected':'#edf1d9','missing':'#fff0df','locked':'#e9e4d6','pressed':'#e2eacb','empty':'#f3efdf'}[state]
  outline={'selected':'#8d9f6e','missing':'#c59b7c','locked':'#c4baa6'}.get(state,'#c7ae88')
  body=rect(1,4,w-2,h-6,9,'#cbb18a')+rect(1,1,w-2,h-5,9,fill,outline,1.4)
  if family=='shelf-card':
   body+=f'<path d="M4 {h-15}h{w-8}v8H4Z" fill="#dec49b"/><path d="M9 {h-10}h12m{w-44} 0h12" stroke="#bfa079" stroke-width="1"/>'
  else:
   body+=f'<path d="M8 20h12M{w-20} 20h12M8 {h-10}h12M{w-20} {h-10}h12" stroke="#d9c5a2" stroke-width="1" stroke-dasharray="2 4"/>'
   body+='<path d="M10 1h14v7H10Z" fill="#b2b98c" stroke="#94a276" stroke-width="1"/>'
  emit(family,state,w,h,body,[24]*4,[24,12,20,12],[12,24,w-24,h-44],([92,96] if family=='shelf-card' else [80,76]) if family!='detail-paper' else [240,96])
for state in ['default','pressed','disabled']:
 fill={'default':'#f8edd5','pressed':'#e8d1aa','disabled':'#e8e2d5'}[state]
 emit('stepper',state,48,48,rect(2,5,44,41,9,'#c9ae86')+rect(2,2,44,41,9,fill,'#b69a74',1.4)+'<path d="M8 11h7M33 35h7" stroke="#c6ab83"/>',[14]*4,[10]*4,[10,10,28,28],[44,44])
for state,fill in [('default','#dfd1ae'),('disabled','#e4ded0')]:
 emit('slider-track',state,96,12,rect(1,2,94,8,4,fill,'#c5b18d',1),[4]*4,[2]*4,[2,2,92,8],[72,8])
for state,fill in [('default','#e8bd91'),('pressed','#d5a675'),('disabled','#d6cbbb')]:
 emit('slider-thumb',state,32,32,'<circle cx="16" cy="17" r="13" fill="#b39a76"/><circle cx="16" cy="15" r="13" fill="'+fill+'" stroke="#a88c66" stroke-width="1.5"/><path d="M12 11v8m8-8v8" stroke="#fff3d7" stroke-width="2"/>',None,[0]*4,None,[28,28])
for state in ['off','on','pressed','disabled']:
 fill={'off':'#fff9e8','on':'#d9e7c1','pressed':'#c7d9ae','disabled':'#e5dfd1'}[state]
 body=rect(3,3,26,26,7,fill,'#ad9978',1.5)
 if state in ['on','pressed']:body+='<path d="m9 16 5 5 9-11" stroke="#748656" stroke-width="2.4"/>'
 emit('checkbox',state,32,32,body,None,[0]*4,None,[24,24])
for state,fill in [('default','#fff3d8'),('missing','#f7ddc8'),('complete','#e4ebce')]:
 emit('resource-pill',state,96,40,rect(1,3,94,35,12,'#d0bb94')+rect(1,1,94,35,12,fill,'#bea580',1.2),[15]*4,[8,12,8,12],[12,8,72,24],[76,36])
for state,fill in [('info','#f7ecd3'),('success','#e3edcf'),('warning','#fae4d0')]:
 emit('toast-paper',state,112,64,rect(1,4,110,58,10,'#cbb794')+rect(1,1,110,58,10,fill,'#bea886',1.3)+'<path d="M9 12h8M95 48h8" stroke="#d4bb91"/>',[18]*4,[12,16,12,16],[16,12,80,40],[200,48])
for state,fill in [('default','#edc4a0'),('complete','#bfcd9d'),('locked','#cbc2ab')]:
 emit('ribbon',state,80,32,f'<path d="M2 2h76v28l-10-4-10 4-10-4-10 4-10-4-10 4-16-4Z" fill="{fill}" stroke="#b09a76" stroke-width="1.2"/>',[12]*4,[6,12,8,12],[12,6,56,18],[64,28])
