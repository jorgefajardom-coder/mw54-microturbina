# Insignia de la deriva: el agujero negro de la tarjeta del Stack con "SINGULARITY" en arco sobre el disco.
# Uso: python blender/assets/make_insignia.py   (escribe blender/assets/insignia.png)
import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
TEXT = "SINGULARITY"
SS = 3  # supermuestreo para que las letras giradas queden limpias

hole = Image.open(os.path.join(HERE, "stack-hole.png")).convert("RGBA")
W, H = hole.size
TOP = 150
out = Image.new("RGBA", (W * SS, (H + TOP) * SS), (0, 0, 0, 0))
font = ImageFont.truetype(FONT, 44 * SS)
# el arco se centra en el centro del disco negro y abraza la parte de arriba del anillo de fotones
cx, cy = 362 * SS, (TOP + 104) * SS
R = 168 * SS
track = 0.16 * SS * 44
widths = [font.getlength(ch) + track for ch in TEXT]
total = sum(widths) - track
span = total / R
a = -math.pi / 2 - span / 2
for ch, w in zip(TEXT, widths):
    mid = a + (w - track) / 2 / R
    glyph = Image.new("RGBA", (int(w * 2), int(80 * SS)), (0, 0, 0, 0))
    ImageDraw.Draw(glyph).text((w * 0.5, 4 * SS), ch, font=font, fill=(255, 176, 102, 255))
    rot = glyph.rotate(-math.degrees(mid + math.pi / 2), resample=Image.BICUBIC, expand=True)
    px = cx + R * math.cos(mid)
    py = cy + R * math.sin(mid)
    out.alpha_composite(rot, (int(px - rot.width / 2), int(py - rot.height / 2)))
    a += w / R
# brillo tenue de brasa detrás de las letras
glow = out.filter(ImageFilter.GaussianBlur(6 * SS))
glow = Image.eval(glow, lambda v: v)
r, g, b, al = glow.split()
glow = Image.merge("RGBA", (r, g, b, al.point(lambda v: int(v * 0.45))))
text = Image.alpha_composite(glow, out).resize((W, H + TOP), Image.LANCZOS)
canvas = Image.new("RGBA", (W, H + TOP), (0, 0, 0, 0))
canvas.alpha_composite(hole, (0, TOP))
canvas.alpha_composite(text)
canvas.save(os.path.join(HERE, "insignia.png"))
print(canvas.size)
