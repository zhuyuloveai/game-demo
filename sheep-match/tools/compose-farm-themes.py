#!/usr/bin/env python3
"""Original farm themes and interaction Foley, no samples or external songs.
Requires Python 3, numpy and ffmpeg. Run from any directory; assets go to media.
The original seasonal synthesis is reused, not its scores or arrangements.
"""
import argparse
import importlib.util
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('season_synth', HERE / 'compose-seasons.py')
synth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(synth)
RATE = synth.RATE
# Scale degrees in G major. Each line is one four-beat bar. A tiny 1-3-2
# seed motif links the two scores; these are newly composed, distinct phrases.
LIFE_A = [
 [(0,1),(2,.5),(1,.5),(4,1),(2,1)],
 [(1,1.5),(0,.5),(-2,1),(None,1)],
 [(0,.5),(2,.5),(3,1),(2,1),(0,1)],
 [(1,1),(4,1),(3,.5),(1,.5),(None,1)],
 [(2,1),(4,1),(5,.5),(4,.5),(2,1)],
 [(0,1.5),(-2,.5),(0,1),(None,1)],
 [(1,.5),(3,.5),(5,1),(3,1),(1,1)],
 [(4,1),(3,.5),(1,.5),(0,1),(None,1)],
]
LIFE_B = [
 [(5,1.5),(7,.5),(5,1),(4,1)],
 [(4,.5),(6,.5),(4,1),(2,1),(None,1)],
 [(3,1),(5,1),(7,.5),(5,.5),(3,1)],
 [(4,1.5),(2,.5),(1,1),(None,1)],
 [(5,.5),(7,.5),(9,1),(7,1),(5,1)],
 [(4,1),(2,.5),(0,.5),(2,1),(None,1)],
 [(3,1),(1,1),(3,.5),(4,.5),(5,1)],
 [(4,1),(1,.5),(3,.5),(2,1),(None,1)],
]
MATCH_A = [
 [(0,.5),(2,.25),(1,.25),(4,.5),(2,.5),(0,1),(None,1)],
 [(4,.75),(6,.25),(4,.5),(2,.5),(1,.5),(2,.5),(None,1)],
 [(5,.5),(4,.5),(2,.75),(0,.25),(2,.5),(5,.5),(4,1)],
 [(3,.5),(1,.5),(4,.5),(6,.5),(4,1),(None,1)],
 [(2,.5),(4,.25),(5,.25),(7,.5),(4,.5),(2,1),(0,1)],
 [(5,.75),(7,.25),(5,.5),(4,.5),(2,.5),(0,.5),(None,1)],
 [(1,.5),(3,.5),(5,.75),(3,.25),(1,.5),(0,.5),(1,1)],
 [(4,.5),(3,.5),(1,.5),(4,.5),(0,1),(None,1)],
]
MATCH_B = [
 [(7,.75),(5,.25),(4,.5),(5,.5),(7,1),(None,1)],
 [(6,.5),(4,.5),(2,.5),(4,.5),(6,.75),(7,.25),(6,1)],
 [(5,.5),(7,.5),(9,.75),(7,.25),(5,.5),(4,.5),(2,1)],
 [(3,.75),(5,.25),(4,.5),(3,.5),(1,1),(None,1)],
 [(7,.5),(4,.5),(2,.5),(4,.5),(7,.5),(9,.5),(7,1)],
 [(5,.75),(4,.25),(2,.5),(0,.5),(2,1),(None,1)],
 [(1,.5),(3,.5),(5,.5),(4,.5),(3,.75),(2,.25),(1,1)],
 [(4,.5),(3,.5),(1,1),(0,1),(None,1)],
]

def fade_tail(signal, seconds=.045):
    signal = signal.copy()
    n=min(len(signal),round(seconds*RATE))
    signal[-n:] *= np.linspace(1,0,n)
    return signal

def write_wav(path, audio):
    pcm=(np.clip(audio,-1,1)*32767).round().astype('<i2')
    with wave.open(str(path),'wb') as out:
        out.setnchannels(audio.shape[1] if audio.ndim==2 else 1)
        out.setsampwidth(2);out.setframerate(RATE);out.writeframes(pcm.tobytes())

def stats(audio):
    peak=float(np.max(np.abs(audio)));rms=float(np.sqrt(np.mean(audio**2)))
    return dict(peak_dbfs=round(20*math.log10(max(peak,1e-12)),3),
        rms_dbfs=round(20*math.log10(max(rms,1e-12)),3),
        boundary_step=round(float(np.max(np.abs(audio[0]-audio[-1]))),7),
        finite=bool(np.isfinite(audio).all()), clipped_samples=int(np.sum(np.abs(audio)>=1)))

def compose(key, output, work):
    playful=key=='farm-match';bpm=120 if playful else 96
    # 40 bars for match, 32 for home: both 80 seconds exactly.
    bars=40 if playful else 32;beat=60/bpm;size=round(bars*4*beat*RATE)
    mix=np.zeros((size,2),np.float32);rng=np.random.default_rng(886 if playful else 772)
    a,b=(MATCH_A,MATCH_B) if playful else (LIFE_A,LIFE_B)
    roots=[0,2,5,4,0,5,1,4] if playful else [0,5,3,4,0,5,1,4]
    events=0
    def add(signal, at, gain, pan):
        nonlocal events
        start=round(at*RATE)%size
        signal=fade_tail(signal)*gain
        stereo=signal[:,None]*np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)],np.float32)
        first=min(len(signal),size-start);mix[start:start+first]+=stereo[:first]
        if first<len(signal):mix[:len(signal)-first]+=stereo[first:]
        events+=1
    def play(degree, at, duration, kind, gain, pan=0):
        note=synth.pitch(67,degree)
        add(synth.tone(note,duration*beat,kind,rng),at*beat,gain*rng.uniform(.93,1.03),pan)
    for bar in range(bars):
        section=bar//8;local=bar%8;start=bar*4;root=roots[local]
        bridge=playful and section==3
        # Home A, B, airy A reprise, warm B answer. Match A, B, A',
        # breakdown/bridge, B' return. A dominant pickup links end to beginning.
        phrase=(a if section in (0,2) else b)[local]
        if bridge:phrase=[(root-3,1.5),(root-1,.5),(root,1),(None,1)]
        if bar==bars-1:phrase=[(4,1),(3,.5),(1,.5),(None,1.5),(-1,.5)]
        assert sum(d for _,d in phrase)==4
        cursor=0
        for degree,duration in phrase:
            if degree is not None:
                lead='flute' if (not playful and section in (1,3)) else 'marimba'
                play(degree,start+cursor,duration*.78,lead,.17 if lead=='flute' else .22,-.12)
                if playful and section==4 and cursor==0:
                    play(degree+7,start+cursor,.35,'pluck',.034,.32)
            cursor+=duration
        # Broken, voiced chords rather than a constant pad. Bridge thins out.
        voicing=[root-7,root-5,root-3,root-5]
        pulses=[0,1.5,2.5] if playful else [0,.5,1.5,2,2.5,3.5]
        if bridge:pulses=[0,2]
        for j,pulse in enumerate(pulses):
            play(voicing[j%4],start+pulse,.52,'guitar' if playful else 'pluck',.075,-.4)
            if playful and pulse in (1.5,2.5):play(voicing[(j+1)%4],start+pulse+.025,.3,'pluck',.045,.3)
        play(root-21,start,.75,'bass',.21)
        if not bridge:play(root-17,start+2,.65,'bass',.16)
        if local in (1,3,5) and not bridge:
            for j,degree in enumerate([root-3,root-1]):
                play(degree,start+3+j*.5,.34,'flute' if playful else 'marimba',.055,.43)
        if not playful and section==2:
            for d in [root-7,root-3]:play(d,start,3.3,'pad',.018,.24)
        for pulse in range(4):
            if bridge and pulse%2:continue
            add(synth.percussion('kick',rng),(start+pulse)*beat,.075 if pulse%2==0 else .025,0)
            add(synth.percussion('brush',rng),(start+pulse+.5)*beat,.085 if playful else .055,.3*(-1)**pulse)
            if playful and pulse in (1,3) and not bridge:
                add(synth.percussion('bongo',rng),(start+pulse+.5)*beat,.065,-.25)
        # Gentle one-bar turnaround every eight bars, no loud drum fills.
        if local==7:
            for j in range(3):
                play([1,3,4][j]-7,start+2.5+j*.5,.25,'pluck',.058,.25)
    dry=mix.copy()
    for delay,gain in [(.043,.09),(.079,.065),(.131,.04),(.211,.024)]:
        mix+=np.roll(dry[:,::-1],round(delay*RATE),axis=0)*gain
    mix-=mix.mean(axis=0)
    mix=np.tanh(mix*1.12)
    mix*=min(.69/np.max(np.abs(mix)),.105/np.sqrt(np.mean(mix**2)))
    # A 3 ms equal-power micro-envelope keeps encoder edge error inaudibly
    # small, without adding silence, extending the bar, or fading the loop.
    edge=round(.003*RATE)
    ramp=np.sin(np.linspace(0,np.pi/2,edge))**2
    mix[:edge]*=ramp[:,None];mix[-edge:]*=ramp[::-1,None]
    wav=work/f'{key}.wav';write_wav(wav,mix)
    encoded=output/f'{key}.m4a'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','aac','-b:a','160k','-movflags','+faststart','-metadata','artist=Sheep Farm Original Audio','-metadata','title='+('牧场慢慢长' if not playful else '菜篮蹦蹦舞'),str(encoded)],check=True)
    decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(encoded),'-f','f32le','-acodec','pcm_f32le','-'])
    dec=np.frombuffer(decoded,dtype='<f4').reshape(-1,2)
    # AAC may decode to a whole final frame. Measure the declared loop interval,
    # and disclose decoder padding separately (HTML media honors MP4 duration).
    main=dec[:size];window=round(.1*RATE)
    assert np.isfinite(main).all() and np.max(np.abs(main))<.85
    windows=[float(np.sqrt(np.mean(main[i:i+RATE]**2))) for i in range(0,len(main),RATE)]
    report=dict(key=key,title='菜篮蹦蹦舞' if playful else '牧场慢慢长',bpm=bpm,meter='4/4',bars=bars,
        duration_seconds=size/RATE,loop_start=0,loop_end=size/RATE,sample_rate=RATE,channels=2,
        format='AAC-LC / M4A, 160 kbps',events=events,pcm=stats(mix),decoded=stats(main),
        decoder_padding_samples=len(dec)-size,minimum_one_second_rms_dbfs=round(20*math.log10(min(windows)),2),
        edge_rms_dbfs=[round(20*math.log10(float(np.sqrt(np.mean(x**2)))),2) for x in (main[:window],main[-window:])],
        recommended_music_volume=.32 if playful else .35,
        sections=['A','B','A airy reprise','B return / dominant pickup'] if not playful else ['A','B','A variation','bridge / half density','B return / dominant pickup'])
    print(json.dumps(report,ensure_ascii=False),flush=True)
    return report

# Multi-layer tonal gestures plus quiet synthetic Foley. No recorded animal
# calls: the animal cue is deliberately a musical chirrup, not a real sample.
CUES={
 'plant':[(0,55,.10,'bass',.19),(.035,67,.14,'pluck',.23),(.10,71,.19,'marimba',.16)],
 'harvest':[(0,67,.17,'pluck',.24),(.055,71,.20,'marimba',.24),(.12,74,.29,'marimba',.21),(.18,79,.30,'flute',.12)],
 'feed':[(0,55,.10,'bass',.18),(.065,62,.12,'pluck',.22),(.13,67,.19,'marimba',.19)],
 'product-ready':[(0,74,.20,'marimba',.20),(.12,71,.18,'marimba',.17),(.24,79,.36,'flute',.17)],
 'coin':[(0,83,.10,'pluck',.20),(.045,86,.16,'marimba',.17)],
 'button':[(0,67,.055,'marimba',.17),(0,55,.045,'bass',.11)],
 'soft-error':[(0,62,.12,'flute',.15),(.12,60,.17,'flute',.13)],
 'upgrade':[(0,55,.35,'bass',.17),(0,67,.18,'pluck',.19),(.10,71,.19,'marimba',.18),(.20,74,.23,'marimba',.18),(.30,79,.36,'flute',.18),(.30,71,.36,'flute',.10)],
 'first-clear':[(0,67,.18,'marimba',.23),(.12,71,.18,'marimba',.21),(.24,74,.20,'marimba',.21),(.36,79,.33,'flute',.18),(.36,71,.33,'flute',.11),(.62,81,.19,'marimba',.17),(.83,79,.40,'flute',.22),(.83,67,.40,'pluck',.16)],
 'water':[(0,74,.10,'marimba',.14),(.08,79,.13,'marimba',.14),(.17,76,.16,'marimba',.13)],
 'animal':[(0,67,.11,'flute',.19),(.10,74,.14,'flute',.16),(.22,71,.18,'marimba',.13)],
 'tile-pick':[(0,71,.07,'pluck',.18),(.018,79,.08,'marimba',.10)],
 'tile-match':[(0,67,.12,'marimba',.18),(.045,71,.15,'marimba',.18),(.09,74,.23,'marimba',.19)],
 'combo':[(0,74,.13,'marimba',.20),(.06,79,.17,'marimba',.18),(.12,83,.22,'flute',.15)],
}

def effects(output):
    directory=output/'farm-sfx';directory.mkdir(exist_ok=True);results=[]
    for i,(key,notes) in enumerate(CUES.items()):
        rng=np.random.default_rng(320+i);length=max(at+duration for at,_,duration,_,_ in notes)+.28
        mix=np.zeros(round(length*RATE),np.float32)
        for at,note,duration,kind,gain in notes:
            # Short action release, unlike sustained music voices.
            y=synth.tone(note,duration,kind,rng)[:round((duration+.22)*RATE)]
            y=fade_tail(y,.12)*gain;start=round(at*RATE)
            n=min(len(y),len(mix)-start);mix[start:start+n]+=y[:n]
        if key in ('plant','harvest','feed','water','button','tile-pick'):
            n=round((.20 if key=='water' else .07)*RATE);t=np.arange(n)/RATE
            noise=rng.standard_normal(n);soft=np.convolve(noise,np.ones(13)/13,mode='same')
            mix[:n]+=soft*.075*np.exp(-t/(.06 if key=='water' else .018))*np.minimum(t/.004,1)
        mix-=mix.mean();mix=fade_tail(mix,.045);mix[:220]*=np.linspace(0,1,220)
        # Retain relative cue levels; only attenuate a rare overshoot.
        mix*=min(1,.44/np.max(np.abs(mix)))
        write_wav(directory/f'{key}.wav',mix)
        results.append(dict(key=key,path=f'farm-sfx/{key}.wav',duration_seconds=round(len(mix)/RATE,4),channels=1,sample_rate=RATE,format='PCM signed 16-bit WAV',recommended_gain=.65,**stats(mix)))
    return results

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=HERE.parent/'media');args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='farm-audio-') as work:
        tracks=[compose(key,args.output,Path(work)) for key in ('farm-life','farm-match')]
    report=dict(version=1,provenance='Original score and procedural synthesis. No external recordings, samples, SoundFonts, or melody material.',subjective_listening_performed=False,tracks=tracks,effects=effects(args.output))
    (args.output/'farm-audio-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':main()
