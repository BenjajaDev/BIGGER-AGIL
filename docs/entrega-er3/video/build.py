import json, subprocess, os
from PIL import Image, ImageDraw
D = os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
marks = json.load(open('raw/marks.json'))
os.makedirs('seg', exist_ok=True)
m = Image.new('L', (415, 900), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 414, 899), 44, fill=255); m.save('mask.png')
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-an']
FADE = 0.45
plan = [('title1', 6.4), ('title2', 8.4), ('s3', 8.4), ('s4', 12.4), ('s5', 8.4), ('s6', 7.4),
        ('s7', 8.4), ('s8', 7.4), ('s9', 10.4), ('s10', 7.4), ('title11', 6.6)]
def run(args): subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *args], check=True)
for name, dur in plan:
    out = f'seg/{name}.mp4'
    if name.startswith('title'):
        # Leve acercamiento para que la tarjeta no se vea congelada.
        run(['-loop', '1', '-t', str(dur), '-i', f'{name}.png', '-filter_complex',
             f"[0:v]scale=2112:1188,zoompan=z='min(1+0.0006*on,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(dur*30)}:s=1920x1080:fps=30[v]",
             '-map', '[v]', '-t', str(dur), *ENC, out])
    elif name == 's9':
        run(['-loop', '1', '-t', str(dur), '-i', 'phonebg.png', '-ss', str(marks[name]), '-i', 'raw/s9.webm', '-loop', '1', '-t', str(dur), '-i', 'mask.png',
             '-filter_complex',
             f"[1:v]fps=30,scale=415:900:flags=lanczos,tpad=stop_mode=clone:stop_duration=4,trim=duration={dur},setpts=PTS-STARTPTS,format=rgba[ph];"
             f"[2:v]format=gray,scale=415:900[mk];[ph][mk]alphamerge[phm];[0:v][phm]overlay=1237:90:shortest=1[v]",
             '-map', '[v]', '-t', str(dur), *ENC, out])
    else:
        run(['-ss', str(marks[name]), '-i', f'raw/{name}.webm', '-loop', '1', '-t', str(dur), '-i', f'cap_{name}.png',
             '-filter_complex',
             f"[0:v]fps=30,scale=1920:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=4,trim=duration={dur},setpts=PTS-STARTPTS[bg];"
             f"[1:v]format=rgba,fade=t=in:st=0.6:d=0.4:alpha=1[cap];[bg][cap]overlay=0:0:shortest=1[v]",
             '-map', '[v]', '-t', str(dur), *ENC, out])
    print('segmento', name)
# Unión con fundidos cruzados.
inputs, chain, offset = [], '', 0.0
for i, (name, dur) in enumerate(plan):
    inputs += ['-i', f'seg/{name}.mp4']
prev = '[0:v]'
for i in range(1, len(plan)):
    offset += plan[i-1][1] - FADE
    lab = f'[x{i}]'
    chain += f"{prev}[{i}:v]xfade=transition=fade:duration={FADE}:offset={offset:.3f}{lab};"
    prev = lab
total = sum(d for _, d in plan) - FADE * (len(plan) - 1)
chain += f"{prev}fade=t=in:st=0:d=0.6,fade=t=out:st={total-0.8:.3f}:d=0.8[v]"
run([*inputs, '-filter_complex', chain, '-map', '[v]', *ENC, '-movflags', '+faststart', 'video-bigger-agil.mp4'])
print('total', round(total, 2), 's')
