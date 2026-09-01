import os
import io
import base64
import math
from flask import Flask, request, send_file, jsonify
from PIL import Image, ImageDraw, ImageFont, ImageFilter

app = Flask(__name__)

W, H = 1080, 1350
WHITE = (255, 255, 255)
NOIR = (16, 16, 19)

MINT = (110, 211, 192)     # #6ED3C0
JAUNE = (242, 208, 107)    # #F2D06B
ROSEBG = (196, 81, 155)    # #C4519B

HL_MINT = (139, 232, 214)  # #8BE8D6
HL_JAUNE = (247, 225, 93)  # #F7E15D
HL_ROSE = (245, 168, 206)  # #F5A8CE

PILIERS = {
    "biz":        {"bg": MINT,   "hl": HL_JAUNE, "label": "Lift Your Biz"},
    "mind":       {"bg": JAUNE,  "hl": HL_ROSE,  "label": "Lift Your Mind"},
    "visibility": {"bg": MINT,   "hl": HL_ROSE,  "label": "Lift Your Visibility"},
    "growth":     {"bg": JAUNE,  "hl": HL_ROSE,  "label": "Lift Your Growth"},
}
DEFAULT_PILIER = "visibility"

FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts", "use")
F_EXTRABOLD = os.path.join(FONT_DIR, "Poppins-ExtraBold.ttf")  # weight 800, comme la charte
F_BOLD = os.path.join(FONT_DIR, "Poppins-Bold.ttf")
F_SEMIBOLD = os.path.join(FONT_DIR, "Poppins-SemiBold.ttf")


def font(path, size):
    return ImageFont.truetype(path, size)


def rounded_rect_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return mask


def paste_with_shadow(canvas, layer_img, x, y, radius, offset=0, blur=32, opacity=95):
    w, h = layer_img.size
    pad = blur * 2
    shadow = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    shape = Image.new("RGBA", (w, h), (0, 0, 0, opacity))
    mask = rounded_rect_mask((w, h), radius)
    shadow.paste(shape, (pad, pad + 18), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.paste(shadow, (x - pad, y - pad), shadow)

    rgba = layer_img.convert("RGBA")
    canvas.paste(rgba, (x, y), rounded_rect_mask((w, h), radius))


def wrap_text(draw, text, f, max_width):
    words = text.split()
    lines, cur = [], ""
    for word in words:
        test = (cur + " " + word).strip()
        if draw.textlength(test, font=f) <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def measure_pill(draw, text, f, pad_x=34, pad_y=15):
    bbox = draw.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    w = tw + pad_x * 2
    h = th + pad_y * 2
    return w, h, bbox


def draw_pill(draw, cx, top_y, text, f, fg, bg, outline=None, pad_x=34, pad_y=15, border_w=3):
    w, h, bbox = measure_pill(draw, text, f, pad_x, pad_y)
    x0 = cx - w / 2
    if outline:
        draw.rounded_rectangle([x0, top_y, x0 + w, top_y + h], radius=h / 2, fill=bg, outline=outline, width=border_w)
    else:
        draw.rounded_rectangle([x0, top_y, x0 + w, top_y + h], radius=h / 2, fill=bg)
    # anchor "mm" = centre horizontal + vertical basé sur les métriques réelles de la police,
    # cohérent quel que soit le texte (avec ou sans jambages descendants)
    draw.text((cx, top_y + h / 2), text, font=f, fill=fg, anchor="mm")
    return h


def draw_pill_centered_on(draw, cx, center_y, text, f, fg, bg, outline=None, pad_x=34, pad_y=15, border_w=3):
    """Comme draw_pill, mais centre la pastille (verticalement) sur center_y au lieu de placer son bord haut."""
    w, h, _ = measure_pill(draw, text, f, pad_x, pad_y)
    top_y = center_y - h / 2
    return draw_pill(draw, cx, top_y, text, f, fg, bg, outline=outline, pad_x=pad_x, pad_y=pad_y, border_w=border_w), h


def draw_hand_underline(draw, x0, x1, y_base, color=NOIR):
    width = x1 - x0
    scale = width / 440.0

    def transform(pts):
        return [(x0 + px * scale, y_base + (py - 14) * 0.9) for px, py in pts]

    pts_main = [(10, 16), (60, 9), (140, 8), (220, 22), (300, 13), (365, 14), (420, 15), (430, 12)]
    pts_thin = [(32, 23), (100, 18), (180, 17), (260, 26), (340, 21), (410, 19)]
    draw.line(transform(pts_main), fill=color, width=7, joint="curve")
    draw.line(transform(pts_thin), fill=color, width=4, joint="curve")


def draw_rotated_highlight(card, x, y, line, f, hl_color, angle=-1.3):
    """Dessine le fragment surligné (fond + texte) légèrement pivoté, comme en CSS transform:rotate(-1deg)."""
    tmp_draw = ImageDraw.Draw(card)
    lw = tmp_draw.textlength(line, font=f)
    asc, desc = f.getmetrics()
    pad_x, pad_y = 20, 10
    w = int(lw + pad_x * 2)
    h = int(asc + desc * 0.4 + pad_y * 2)

    frag = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frag)
    fd.rounded_rectangle([0, 0, w, h], radius=8, fill=hl_color)
    fd.text((pad_x, pad_y - desc * 0.25), line, font=f, fill=NOIR)

    frag = frag.rotate(angle, resample=Image.BICUBIC, expand=True)
    card.paste(frag, (int(x - pad_x - (frag.width - w) / 2), int(y - pad_y - (frag.height - h) / 2)), frag)
    return w - pad_x * 2  # largeur utile du texte (sans le padding) pour positionner le soulignement


def generate_post_image(jour, accroche, pilier_key, cta_url="www.lywagency.com"):
    pilier = PILIERS.get(pilier_key, PILIERS[DEFAULT_PILIER])
    bg_color = pilier["bg"]
    hl_color = pilier["hl"]

    img = Image.new("RGB", (W, H), bg_color)

    card_w, card_h = 870, 1120
    card_x = (W - card_w) // 2
    card_y = 116

    card = Image.new("RGB", (card_w, card_h), WHITE)
    cdraw = ImageDraw.Draw(card)

    max_text_w = card_w - 160
    f_head = font(F_EXTRABOLD, 64)
    lines = wrap_text(cdraw, accroche.upper(), f_head, max_text_w)

    line_h = 84
    n = len(lines)
    block_h = n * line_h + 50  # + espace pour le soulignement
    zone_top = 260
    zone_bottom = card_h - 190
    y = zone_top + max((zone_bottom - zone_top) - block_h, 0) / 2

    last_rect = None
    for idx, line in enumerate(lines):
        lw = cdraw.textlength(line, font=f_head)
        x = (card_w - lw) / 2
        is_last = idx == n - 1
        if is_last:
            draw_rotated_highlight(card, x, y, line, f_head, hl_color)
            last_rect = (x, y, x + lw, y + line_h)
        else:
            cdraw.text((x, y), line, font=f_head, fill=NOIR)
        y += line_h

    if last_rect:
        underline_y = last_rect[3] + 22
        draw_hand_underline(cdraw, last_rect[0] + 12, last_rect[2] - 12, underline_y)

    # pastille noire URL, DANS la carte, centrée verticalement dans son espace
    f_url = font(F_SEMIBOLD, 26)
    draw_pill_centered_on(cdraw, card_w / 2, card_h - 130, cta_url, f_url, WHITE, NOIR)

    paste_with_shadow(img, card, card_x, card_y, radius=26)

    # pastille "Lift Your X" centrée pile sur le bord haut de la carte
    draw = ImageDraw.Draw(img)
    f_pill = font(F_SEMIBOLD, 34)
    draw_pill_centered_on(draw, W / 2, card_y, pilier["label"], f_pill, NOIR, WHITE, outline=NOIR, pad_x=42, pad_y=20)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True) or {}
    jour = data.get("jour", "")
    accroche = data.get("accroche", "")
    pilier = data.get("pilier", DEFAULT_PILIER)
    fmt = data.get("format", "binary")

    if not accroche:
        return jsonify({"error": "Le champ 'accroche' est requis."}), 400

    buf = generate_post_image(jour, accroche, pilier)

    if fmt == "base64":
        encoded = base64.b64encode(buf.read()).decode("utf-8")
        return jsonify({"image_base64": encoded})

    return send_file(buf, mimetype="image/png", as_attachment=False, download_name="post.png")


@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "LYW visual generator"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
