#!/usr/bin/env python3
"""Render four original, sample-free instrumental game loops using NumPy.

Usage: python3 tools/compose-seasons.py --output /tmp/seasonal-wavs
Melodies, arrangement, synthesized instruments and room treatment live here.
No downloaded recordings, sound fonts or third-party melody material is used.
"""
import argparse
import json
import math
import wave
from pathlib import Path

import numpy as np

RATE = 44100
SCALE = [0, 2, 4, 5, 7, 9, 11]
# Scale degree 0 is the tonic. None is a musical rest. Durations are in beats.
SPRING_A = [
    [(2,.5),(4,.5),(5,1),(4,.5),(2,.5),(1,.5),(2,.5)],
    [(0,1),(2,.5),(4,.5),(6,.5),(4,.5),(2,1)],
    [(5,.5),(4,.5),(2,1),(0,.5),(1,.5),(2,1)],
    [(1,.5),(3,.5),(4,.5),(6,.5),(5,1),(4,1)],
    [(2,.5),(4,.5),(7,1),(6,.5),(4,.5),(2,.5),(4,.5)],
    [(5,1),(4,.5),(2,.5),(0,1),(None,1)],
    [(1,.5),(2,.5),(3,1),(5,.5),(3,.5),(1,.5),(0,.5)],
    [(1,1),(4,.5),(3,.5),(2,.5),(1,.5),(None,1)],
]
SPRING_B = [
    [(7,1),(4,.5),(5,.5),(7,.5),(6,.5),(4,1)],
    [(6,.5),(4,.5),(2,1),(4,1),(None,1)],
    [(5,.5),(7,.5),(9,1),(7,.5),(5,.5),(4,1)],
    [(3,1),(4,.5),(5,.5),(4,1),(1,1)],
    [(4,.5),(7,.5),(6,.5),(4,.5),(2,1),(0,1)],
    [(2,.5),(4,.5),(5,1),(7,.5),(5,.5),(4,1)],
    [(3,.5),(5,.5),(4,1),(2,.5),(3,.5),(1,1)],
    [(4,1),(3,.5),(1,.5),(0,1),(None,1)],
]
SUMMER_A = [
    [(4,.75),(2,.25),(4,.5),(7,.5),(5,.75),(4,.25),(2,.5),(None,.5)],
    [(2,.5),(4,.5),(6,.75),(4,.25),(2,1),(None,1)],
    [(5,.75),(7,.25),(5,.5),(4,.5),(2,.75),(0,.25),(2,.5),(4,.5)],
    [(3,.5),(4,.5),(6,.5),(5,.5),(4,1),(None,1)],
    [(7,.75),(4,.25),(2,.5),(4,.5),(7,.5),(9,.5),(7,1)],
    [(5,.5),(4,.5),(2,.75),(0,.25),(2,1),(None,1)],
    [(1,.75),(3,.25),(5,.5),(3,.5),(4,.5),(3,.5),(1,.5),(None,.5)],
    [(4,.5),(6,.5),(5,.5),(3,.5),(1,1),(None,1)],
]
SUMMER_B = [
    [(7,.5),(9,.5),(7,.75),(4,.25),(5,.5),(4,.5),(2,1)],
    [(6,.75),(4,.25),(2,.5),(4,.5),(6,.5),(7,.5),(6,1)],
    [(5,.5),(7,.5),(9,.5),(7,.5),(5,.75),(4,.25),(2,.5),(None,.5)],
    [(3,.75),(5,.25),(4,.5),(3,.5),(1,1),(None,1)],
    [(4,.5),(7,.5),(9,1),(7,.5),(4,.5),(2,.5),(4,.5)],
    [(5,.75),(7,.25),(5,.5),(4,.5),(2,1),(0,1)],
    [(3,.5),(5,.5),(4,.75),(3,.25),(1,.5),(2,.5),(3,.5),(None,.5)],
    [(4,.75),(3,.25),(1,.5),(4,.5),(0,1),(None,1)],
]
AUTUMN_A = [
    [(2,1),(4,.5),(5,.5),(4,1)],[(6,1),(4,.5),(2,.5),(1,1)],
    [(0,.5),(2,.5),(5,1),(4,.5),(2,.5)],[(3,1),(4,.5),(3,.5),(1,1)],
    [(4,.5),(2,.5),(0,1),(2,1)],[(5,1),(4,.5),(2,.5),(0,1)],
    [(1,.5),(3,.5),(5,1),(3,1)],[(4,1),(3,.5),(1,.5),(None,1)],
]
AUTUMN_B = [
    [(7,1),(6,.5),(4,.5),(2,1)],[(4,.5),(6,.5),(7,1),(6,1)],
    [(5,1),(7,.5),(5,.5),(4,1)],[(3,.5),(5,.5),(4,1),(1,1)],
    [(4,1),(7,.5),(6,.5),(4,1)],[(5,.5),(4,.5),(2,1),(0,1)],
    [(3,1),(2,.5),(1,.5),(3,1)],[(4,.5),(3,.5),(1,1),(0,1)],
]
WINTER_A = [
    [(4,1),(7,.5),(6,.5),(4,1),(2,1)],
    [(6,.5),(4,.5),(2,1),(4,.5),(6,.5),(None,1)],
    [(5,1),(7,1),(5,.5),(4,.5),(2,1)],
    [(3,.5),(4,.5),(6,1),(4,1),(None,1)],
    [(7,.5),(4,.5),(2,1),(4,.5),(7,.5),(6,1)],
    [(5,1),(4,.5),(2,.5),(0,1),(None,1)],
    [(1,.5),(3,.5),(5,1),(3,.5),(2,.5),(1,1)],
    [(4,1),(3,.5),(1,.5),(2,.5),(1,.5),(None,1)],
]
WINTER_B = [
    [(7,1),(9,.5),(7,.5),(4,1),(5,1)],
    [(6,1),(4,.5),(6,.5),(7,1),(None,1)],
    [(9,.5),(7,.5),(5,1),(7,.5),(5,.5),(4,1)],
    [(5,1),(4,.5),(3,.5),(1,1),(None,1)],
    [(7,.5),(6,.5),(4,1),(2,.5),(4,.5),(7,1)],
    [(5,1),(7,.5),(5,.5),(4,1),(2,1)],
    [(3,1),(5,.5),(4,.5),(3,.5),(2,.5),(1,1)],
    [(4,1),(3,.5),(1,.5),(0,1),(None,1)],
]
SCORES = [
    dict(key='spring', title='春日蹦蹦芽', bpm=112, meter=4, tonic=62, lead='marimba', pad='flute', chords='pluck', a=SPRING_A, b=SPRING_B, seed=301),
    dict(key='summer', title='夏日汽水湾', bpm=124, meter=4, tonic=67, lead='pan', pad='marimba', chords='guitar', a=SUMMER_A, b=SUMMER_B, seed=613),
    dict(key='autumn', title='秋日栗子舞', bpm=108, meter=3, tonic=65, lead='piano', pad='pluck', chords='piano', a=AUTUMN_A, b=AUTUMN_B, seed=929),
    dict(key='winter', title='冬日雪花铃', bpm=110, meter=4, tonic=60, lead='celesta', pad='pad', chords='pluck', a=WINTER_A, b=WINTER_B, seed=1221),
]
# Imaj7, iii7, vi7, IVmaj7, I6, vi7, ii7, V7. Diatonic motifs follow each harmony.
ROOTS = [0, 2, 5, 3, 0, 5, 1, 4]

def pitch(tonic, degree):
    octave, note = divmod(degree, 7)
    return tonic + SCALE[note] + 12 * octave

def tone(midi, duration, kind, rng):
    tail = 1.4 if kind in ('celesta', 'piano') else .5
    length = max(.12, duration + tail)
    t = np.arange(round(length * RATE), dtype=np.float64) / RATE
    frequency = 440 * 2 ** ((midi - 69) / 12)
    phase = 2 * np.pi * frequency * t
    attack = 1 - np.exp(-t / (.022 if kind in ('flute','pad') else .003))
    gate = np.exp(-np.maximum(t - duration, 0) / (.22 if kind != 'pad' else .4))
    if kind == 'marimba':
        y = (np.sin(phase) * np.exp(-t/1.0) + .27*np.sin(phase*4.01)*np.exp(-t/.105) + .08*np.sin(phase*7)*np.exp(-t/.045))
    elif kind == 'pan':
        y = (np.sin(phase + .8*np.exp(-t/.07)*np.sin(phase*2))*.8 + .19*np.sin(phase*2)*np.exp(-t/.3) + .09*np.sin(phase*3.01)*np.exp(-t/.08))*np.exp(-t/.7)
    elif kind in ('pluck','guitar'):
        y = np.zeros_like(t)
        for h in range(1, 8 if kind=='guitar' else 5):
            y += (.85/h**1.5)*np.sin(phase*h + .04*h)*np.exp(-t/(1.2/(h**.5)))
        y += .012*rng.standard_normal(len(t))*np.exp(-t/.012)
    elif kind == 'piano':
        y = np.zeros_like(t)
        for h in range(1, 9):
            partial = phase*h*math.sqrt(1 + .000025*h*h)
            y += (.82/h**1.6)*np.sin(partial)*np.exp(-t/(1.9/h**.45))
            y += (.12/h**1.9)*np.sin(partial*1.0008)*np.exp(-t/(1.2/h**.4))
    elif kind == 'celesta':
        y = np.sin(phase)*np.exp(-t/1.6)+.26*np.sin(phase*2)*np.exp(-t/.6)+.09*np.sin(phase*3.98)*np.exp(-t/.12)
    elif kind == 'flute':
        vibrato = .013*np.sin(2*np.pi*4.7*t)*np.minimum(t/.3,1)
        y = (.85*np.sin(phase+vibrato)+.1*np.sin(2*phase)+.025*np.sin(3*phase))*np.exp(-t/3)
    elif kind == 'pad':
        attack = 1-np.exp(-t/.12)
        y=(np.sin(phase)*.6+np.sin(phase*1.0015)*.25+.06*np.sin(phase*2))*np.exp(-t/8)
    elif kind == 'bass':
        y=(np.sin(phase)+.25*np.sin(phase*2)*np.exp(-t/.12)) * np.exp(-t/.5)
    else:
        raise ValueError(kind)
    return (y*attack*gate).astype(np.float32)

def percussion(kind, rng):
    t=np.arange(round(RATE*.26))/RATE
    noise=rng.standard_normal(len(t))
    high=noise-np.convolve(noise,np.ones(7)/7,mode='same')
    if kind=='kick':
        y=np.sin(2*np.pi*(48*t+18*.025*(1-np.exp(-t/.025))))*np.exp(-t/.055)
    elif kind=='bongo':
        y=(np.sin(2*np.pi*180*t+.6*np.exp(-t/.018))+noise*.1)*np.exp(-t/.045)
    elif kind=='brush':
        y=high*.3*np.exp(-t/.045)*(1-np.exp(-t/.006))
    elif kind=='sleigh':
        y=(high*.1+np.sin(2*np.pi*4120*t)*.12+np.sin(2*np.pi*5370*t)*.08)*np.exp(-t/.055)
    else:
        y=high*.23*np.exp(-t/.025)*(1-np.exp(-t/.001))
    y*=np.minimum(t/.001,1)
    return y.astype(np.float32)

def compose(score, directory):
    beat=60/score['bpm']; meter=score['meter']; bars=32
    size=round(bars*meter*beat*RATE)
    mix=np.zeros((size,2),dtype=np.float32)
    rng=np.random.default_rng(score['seed'])
    events=[]
    def add(signal, at, gain, pan, instrument, note=None):
        # Circular mixing carries release tails across the loop boundary.
        start=round(at*RATE)%size
        signal=signal*gain
        stereo=signal[:,None]*np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)],dtype=np.float32)
        first=min(len(signal),size-start)
        mix[start:start+first]+=stereo[:first]
        if first<len(signal):mix[:len(signal)-first]+=stereo[first:]
        events.append(dict(time=round(at,4),instrument=instrument,note=note))
    def play(degree, at_beat, beats, kind, gain, pan=0, octave=0):
        midi=pitch(score['tonic']+octave*12,degree)
        offset=rng.uniform(-.005,.005) if at_beat else 0
        add(tone(midi,beats*beat,kind,rng),at_beat*beat+offset,gain*rng.uniform(.92,1.04),pan,kind,midi)
    for bar in range(bars):
        start=bar*meter; root=ROOTS[bar%8]
        section=bar//8
        phrase=(score['a'] if section%2==0 else score['b'])[bar%8]
        assert abs(sum(d for _,d in phrase)-meter)<1e-6
        cursor=0
        for degree,duration in phrase:
            if degree is not None:
                play(degree,start+cursor,duration*.78,score['lead'],.21 if score['key']!='winter' else .17,pan=-.08)
                # Quiet upper sparkle only in the return section.
                if section==2 and cursor in (0,2) and score['key'] in ('spring','winter'):
                    play(degree,start+cursor,.28,'celesta',.035,.37,octave=1)
            cursor+=duration
        # Upper chord voicing stays beneath the melody with thirds/sixths.
        voicing=[root-7,root-5,root-3]
        if score['key']=='summer':
            for strum in (.5,1.5,2.5,3.5):
                for j,d in enumerate(voicing):play(d,start+strum+j*.025,.4,'guitar',.068,-.38+j*.16)
        elif meter==3:
            for pulse in (1,2):
                for j,d in enumerate(voicing):play(d,start+pulse+j*.018,.53,'piano',.055,-.3+j*.14)
        else:
            for j in range(8):play(voicing[j%3],start+j*.5,.36,score['chords'],.065,-.42+j%2*.14)
        play(root-14,start,.7,'bass',.19,0)
        play(root-10,start+(2 if meter==4 else 2),.5,'bass',.14,0)
        # Short answer phrases leave air around the main melody.
        if bar%4 in (1,3):
            for j,d in enumerate((root-3,root-5)):
                play(d,start+meter-1+j*.5,.4,score['pad'],.052,.48)
        if score['key']=='winter':
            for d in voicing:play(d,start,3.4,'pad',.025,.25)
        for pulse in range(meter):
            at=(start+pulse)*beat
            add(percussion('kick',rng),at,.095 if pulse==0 else .055,0,'kick')
            shaker='sleigh' if score['key']=='winter' else 'brush' if score['key']=='autumn' else 'shaker'
            add(percussion(shaker,rng),at+.5*beat,.12,.4 if pulse%2 else -.4,shaker)
            if score['key']=='summer' and pulse in (1,3):
                add(percussion('bongo',rng),at+.25*beat,.075,-.2,'bongo')
    # Short stereo room. Circular delays preserve the exact loop period.
    dry=mix.copy()
    for delay,gain in [(.041,.105),(.073,.075),(.119,.055),(.181,.035),(.277,.023)]:
        mix+=np.roll(dry[:,::-1],round(delay*RATE),axis=0)*gain
    mix-=mix.mean(axis=0)
    mix=np.tanh(mix*1.25)
    gain=min(.82/float(np.max(np.abs(mix))), .12/float(np.sqrt(np.mean(mix**2))))
    mix*=gain
    assert np.isfinite(mix).all()
    pcm=(np.clip(mix,-1,1)*32767).round().astype('<i2')
    filename=directory/f"{score['key']}-pasture.wav"
    with wave.open(str(filename),'wb') as out:
        out.setnchannels(2);out.setsampwidth(2);out.setframerate(RATE);out.writeframes(pcm.tobytes())
    report=dict(season=score['key'],title=score['title'],bpm=score['bpm'],meter=f'{meter}/4',bars=bars,
        duration=round(size/RATE,4),sample_rate=RATE,channels=2,events=len(events),peak_dbfs=round(20*math.log10(float(np.max(np.abs(mix)))),2),
        rms_dbfs=round(20*math.log10(float(np.sqrt(np.mean(mix**2)))),2),boundary_step=float(np.max(np.abs(mix[0]-mix[-1]))))
    print(json.dumps(report,ensure_ascii=False),flush=True)
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    reports=[compose(score,args.output) for score in SCORES]
    (args.output/'composition-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
