"""Recreate the prompt plan for the 42 plant states. Does not call image APIs."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent
COMMON = '''Use case: stylized-concept.
Asset type: ONE transparent PNG plant sprite for the existing cute 2D farm game.
Reference role: the attached image is the APPROVED MATURE PLANT and STYLE REFERENCE. Create the specified DIFFERENT growth state of that same species. Keep its characteristic leaf shape, branching, cluster arrangement and gentle thin warm-tan contour. This new state belongs to the same asset family.
Style: very simple flat pastel farming-game illustration, rounded soft shapes, light warm tan outlines, restrained flat cel shadow, muted light green leaves, soft honey wood. Same orthographic elevated three-quarter camera and ground axes around +/-26.6 degrees as the reference. No realistic texture, glossy lighting, dramatic highlights, heavy dark borders, or white sticker border.
Composition: one compact whole plant/clump only, centered, completely visible, occupying about 75 percent of the canvas, transparent padding on every side. Actual alpha transparency, crisp silhouettes with solid opaque internal colors. NO background, ground tile, soil patch, pot, cast shadow, haze, halo, loose props, text, labels or contact sheet. No face, character or human.
'''
crops = {
 'wheat':('小麦','A short clump of 3-5 fresh slender wheat shoots with simple paired grass blades; no ears or grain.','A taller compact tuft of green wheat stems and arching narrow leaves, with at most tiny green closed heads; absolutely no ripe golden ears.'),
 'corn':('玉米','A compact group of two very young corn seedlings with 3-4 smooth pointed light-green leaves each, short soft stems; no cobs.','Two knee-high corn stalks with broad alternating arching leaves, a few tiny immature green husks and no yellow kernels or ripe tassels.'),
 'soybean':('大豆','A small cluster of two young soybean seedlings with paired round cotyledons and the first soft oval leaves, short delicate stems; no pods.','A compact leafy soybean bush matching the reference branching and rounded pointed oval leaves; a few tiny pale-green immature pods allowed, no plump mature hanging pods.'),
 'sugarcane':('甘蔗','Three very short pale-green cane shoots with two or three narrow upright leaves, a few gentle stem segments; no tall thick mature canes.','Three medium-height slim segmented green canes with sparse curved narrow leaves; softer and shorter than the mature reference, about half as many stem segments.'),
 'carrot':('胡萝卜','Three tiny carrot tops made of short delicate divided green leaves emerging at adjacent ground-level anchor points; no exposed orange roots.','Three fuller short feathery carrot leaf rosettes, the foliage shape of the reference; at most a tiny pale-orange shoulder at the base, no large visible carrots.'),
 'indigo':('靛蓝','A tiny clump of short stems carrying small rounded oval paired leaves; no purple flowers.','A compact indigo plant with several upright green stems and alternating small oval leaves; tiny closed green buds allowed, no purple flower spikes.'),
 'pumpkin':('南瓜','Two squat pumpkin seedlings with paired round cotyledons and one small lobed leaf, very short winding stems; no pumpkin fruits.','A low rounded pumpkin vine with broad softly lobed leaves and short curls. One tiny pale-yellow closed flower bud allowed, no orange fruit or full pumpkin.'),
 'cotton':('棉花','A short cotton seedling with two round cotyledons and two first soft lobed leaves on a pale-green stem; no flowers or cotton.','A medium small branching cotton plant with broad lobed muted-green leaves and several closed green rounded cotton bolls; no white fluffy cotton.'),
 'chili-pepper':('辣椒','A small pepper seedling with a thin green stem and two pairs of pointed oval leaves; no pepper fruits.','A bushy half-grown pepper plant matching the reference leaf/stem design, with two tiny pale-green immature peppers or white flower buds; no red fruit.'),
 'black-bean':('黑豆','A compact seedling with paired round cotyledons and two soft blue-green oval leaves, a short green stem; no purple pods or exposed beans.','A small upright branching bean plant with the reference muted blue-green rounded leaves and a few tiny slender green pods; no dark mature pods or open beans.'),
 'tomato':('番茄','A short tomato seedling with two rounded cotyledons and the first softly scalloped true leaves, no fruit and no tall support stake.','A medium tomato vine on a short warm-tan wooden support matching the mature reference, soft scalloped leaves and a few tiny pale-green tomatoes; no red fruit.'),
}
fruits = {
 'apple':('苹果树','apple tree with round scalloped leaves and a short warm-tan branching trunk'),
 'raspberry':('树莓','low rounded raspberry bush with soft pointed oval leaves and a few thin warm-tan branching stems'),
 'cherry':('樱桃树','cherry tree with rounded leafy canopy lobes, a wide short branching trunk and slightly pointed leaves'),
 'blackberry':('黑莓','compact blackberry bramble with clustered soft pointed leaves and thin forked warm-tan stems'),
 'blueberries':('蓝莓','small blueberry shrub with elongated rounded leaves and several smooth branching honey-tan stems'),
}
states = {'young':'幼株','growing':'生长中','wilt_help':'待复苏','wilt_final':'枯死'}
jobs=[]
for key,(label,sprout,grown) in crops.items():
 for state,desc,scale in [('sprout',sprout,.48),('grown',grown,.78)]:
  sid=f'{key}-{state}'
  jobs.append({'key':sid,'plant':key,'label':label,'group':'crops','state':state,'stateLabel':'幼苗' if state=='sprout' else '生长期','displayScale':scale,'path':f'assets/crops/{sid}.png','reference':f'../assets/crops/{key}.png','prompt':COMMON+'\nSPECIES / STATE: '+label+' / '+state+'.\nSUBJECT: '+desc})
for key,(label,identity) in fruits.items():
 for state in states:
  desc={
  'young':f'A juvenile {identity}. Short slender stems, a small sparse but healthy canopy with only a few leaf clusters. No fruit, buds or flowers. Keep species identity and reference line style.',
  'growing':f'A healthy growing {identity}. Retain the mature reference silhouette, trunk arrangement and leaf colors, but completely remove every fruit. Full fresh leafy canopy, no ripe fruit, no flower clusters.',
  'wilt_help':f'A temporarily wilted, recoverable {identity}. Retain the same mature trunk and branch silhouette. Drooping light olive and pale yellow leaves with a few remaining muted-green leaves; about half the canopy remains. Branches are alive and gently bent. Absolutely no fruit. Clearly tired rather than fully dead, no symbols or text.',
  'wilt_final':f'A finally withered dry {identity}. Retain recognizable mature trunk and main branch structure, now warm muted tan dry branches. Bare silhouette with only two to five curled small ochre-brown leaves attached. No green leaves, no fruit, no blossoms, no ground pile. Gentle cute flat style, not spooky, no face or skull.'}[state]
  sid=f'{key}-{state}'
  jobs.append({'key':sid,'plant':key,'label':label,'group':'fruit-plants','state':state,'stateLabel':states[state],'displayScale':.55 if state=='young' else 1,'path':f'assets/fruit-plants/{sid}.png','reference':f'../assets/fruit-plants/{key}.png','prompt':COMMON+'\nSPECIES / STATE: '+label+' / '+state+'.\nSUBJECT: '+desc})
assert len(jobs)==42
(ROOT/'jobs.json').write_text(json.dumps({'schemaVersion':1,'mode':'builtin-imagegen','expected':42,'jobs':jobs},ensure_ascii=False,indent=2)+'\n')
print('Prepared 42 individual image generation jobs.')
