#!/usr/bin/env python3
"""
analyse_video.py — transforme un lien vidéo (Instagram, YouTube, Facebook, TikTok…)
en matière lisible par Claude :

  videos/<id>/
    video.mp4          la vidéo téléchargée
    meta.json          titre, auteur, durée, description, stats
    frames/            images clés (frame_0001.jpg …) avec leur timestamp
    frames.json        liste [{fichier, seconde}]
    transcript.txt     transcription horodatée de l'audio (si whisper dispo)
    rapport.md         résumé prêt à lire pour Claude

Usage :
  python tools/analyse_video.py "<lien>" [--frames 12] [--no-transcript] [--lang fr]
  python tools/analyse_video.py chemin/vers/video.mp4   # fonctionne aussi en local
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_ROOT = ROOT / "videos"


def die(msg):
    print(f"❌ {msg}", file=sys.stderr)
    sys.exit(1)


def need(binary, hint):
    if shutil.which(binary) is None:
        die(f"'{binary}' introuvable. {hint}")


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


def slug(text):
    s = re.sub(r"[^a-zA-Z0-9_-]+", "-", text).strip("-")
    return s[:60] or hashlib.md5(text.encode()).hexdigest()[:10]


def platform_of(url):
    u = url.lower()
    for key, name in [("instagram", "Instagram"), ("tiktok", "TikTok"),
                      ("youtu", "YouTube"), ("facebook", "Facebook"), ("fb.watch", "Facebook")]:
        if key in u:
            return name
    return "Fichier local" if os.path.exists(url) else "Autre"


def download(url, cookies_from_browser=None):
    need("yt-dlp", "Installe-le : pip install -r requirements.txt")
    base = ["yt-dlp", "--no-playlist", "--no-warnings"]
    if cookies_from_browser:
        base += ["--cookies-from-browser", cookies_from_browser]

    # Métadonnées
    info = json.loads(run(base + ["-J", url]).stdout)
    meta = {
        "plateforme": platform_of(url),
        "url": url,
        "id": info.get("id"),
        "titre": info.get("title"),
        "auteur": info.get("uploader") or info.get("channel") or info.get("creator"),
        "duree_s": info.get("duration"),
        "date": info.get("upload_date"),
        "description": info.get("description"),
        "vues": info.get("view_count"),
        "likes": info.get("like_count"),
        "commentaires": info.get("comment_count"),
        "hashtags": info.get("tags") or [],
        "largeur": info.get("width"),
        "hauteur": info.get("height"),
    }
    out_dir = OUT_ROOT / slug(f"{meta['plateforme']}-{meta['id'] or url}")
    out_dir.mkdir(parents=True, exist_ok=True)

    # Vidéo (mp4 ≤ 720p suffit pour l'analyse)
    run(base + ["-f", "bv*[height<=720]+ba/b[height<=720]/b",
                "--merge-output-format", "mp4",
                "-o", str(out_dir / "video.%(ext)s"), url])
    video = next(p for p in out_dir.glob("video.*") if p.suffix not in (".part", ".ytdl"))

    # Sous-titres officiels si dispo (plus fiables que whisper)
    try:
        run(base + ["--skip-download", "--write-subs", "--write-auto-subs",
                    "--sub-langs", "fr.*,en.*", "--sub-format", "vtt",
                    "-o", str(out_dir / "subs"), url])
    except subprocess.CalledProcessError:
        pass
    return video, meta, out_dir


def probe_duration(video):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
               "-of", "default=nw=1:nk=1", str(video)]).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return None


def extract_frames(video, out_dir, n):
    """Images réparties régulièrement + changements de plan (détection de scène)."""
    frames_dir = out_dir / "frames"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir()
    duration = probe_duration(video) or 0
    if duration <= 0:
        die("Impossible de lire la durée de la vidéo.")

    # 1) Changements de plan (cuts) : on récupère leurs timestamps
    cuts = []
    try:
        res = subprocess.run(
            ["ffmpeg", "-hide_banner", "-i", str(video), "-filter:v",
             "select='gt(scene,0.35)',showinfo", "-f", "null", "-"],
            text=True, capture_output=True)
        cuts = [float(t) for t in re.findall(r"pts_time:([0-9.]+)", res.stderr)]
    except Exception:
        pass

    # 2) Timestamps réguliers
    regular = [duration * (i + 0.5) / n for i in range(n)]
    # Toujours la toute première seconde (le "hook")
    # Les changements de plan sont prioritaires (+0.1 s pour être après le cut)
    priority = [min(0.3, duration / 2)] + [min(c + 0.1, duration - 0.05) for c in cuts[: n * 2]]
    picked = []
    for t in priority + regular:
        if all(abs(t - p) >= 0.8 for p in picked):
            picked.append(t)
    picked.sort()
    if len(picked) > 2 * n:
        step = len(picked) / (2 * n)
        picked = [picked[int(i * step)] for i in range(2 * n)]

    frames = []
    for i, t in enumerate(picked, 1):
        name = f"frame_{i:04d}_{t:06.2f}s.jpg"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                        "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1",
                        "-vf", "scale='min(720,iw)':-2", "-q:v", "3",
                        str(frames_dir / name)], check=True)
        frames.append({"fichier": f"frames/{name}", "seconde": round(t, 2)})
    (out_dir / "frames.json").write_text(json.dumps(frames, indent=2, ensure_ascii=False))
    return frames, duration, len(cuts)


def vtt_to_text(vtt_path):
    lines, last = [], None
    for block in vtt_path.read_text(errors="ignore").split("\n\n"):
        m = re.search(r"(\d+):(\d+):(\d+)\.\d+ -->", block)
        if not m:
            continue
        sec = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3])
        txt = " ".join(l for l in block.splitlines()[1:] if "-->" not in l)
        txt = re.sub(r"<[^>]+>", "", txt).strip()
        if txt and txt != last:
            lines.append(f"[{sec // 60:02d}:{sec % 60:02d}] {txt}")
            last = txt
    return "\n".join(lines)


def transcribe(video, out_dir, lang, model_size):
    subs = sorted(out_dir.glob("subs*.vtt"))
    if subs:
        text = vtt_to_text(subs[0])
        if text:
            return text, f"sous-titres de la plateforme ({subs[0].name})"
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None, "faster-whisper non installé (pip install faster-whisper)"
    try:
        model = WhisperModel(model_size, device="auto", compute_type="int8")
        segments, info = model.transcribe(str(video), language=lang, vad_filter=True)
        lines = [f"[{int(s.start) // 60:02d}:{int(s.start) % 60:02d}] {s.text.strip()}"
                 for s in segments]
    except Exception as e:  # modèle non téléchargeable, audio absent, etc.
        return None, f"échec whisper ({type(e).__name__}: {str(e)[:120]})"
    if not lines:
        return "", f"whisper {model_size} — aucune parole détectée (musique seule ?)"
    return "\n".join(lines), f"whisper {model_size} (langue : {info.language})"


def main():
    p = argparse.ArgumentParser(description="Analyse une vidéo pour inspiration.")
    p.add_argument("source", help="Lien Instagram/YouTube/Facebook/TikTok ou fichier local")
    p.add_argument("--frames", type=int, default=12, help="Nb d'images régulières (défaut 12)")
    p.add_argument("--no-transcript", action="store_true")
    p.add_argument("--lang", default=None, help="Langue forcée pour whisper (ex: fr)")
    p.add_argument("--model", default="small", help="Modèle whisper : tiny/base/small/medium")
    p.add_argument("--cookies-from-browser", default=None,
                   help="chrome/firefox/safari — utile pour Instagram/Facebook privés ou bloqués")
    a = p.parse_args()

    need("ffmpeg", "Installe ffmpeg : https://ffmpeg.org (Mac : brew install ffmpeg)")

    if os.path.exists(a.source):
        src = Path(a.source).resolve()
        out_dir = OUT_ROOT / slug(f"local-{src.stem}")
        out_dir.mkdir(parents=True, exist_ok=True)
        video = out_dir / "video.mp4"
        if src != video:
            shutil.copy(src, video)
        meta = {"plateforme": "Fichier local", "url": str(src), "titre": src.stem}
    else:
        try:
            video, meta, out_dir = download(a.source, a.cookies_from_browser)
        except subprocess.CalledProcessError as e:
            die("Téléchargement impossible :\n" + (e.stderr or "")[-800:] +
                "\n→ Astuce : relance avec --cookies-from-browser chrome (Instagram/Facebook), "
                "ou mets à jour yt-dlp : pip install -U yt-dlp")

    print("🎞  Extraction des images clés…")
    frames, duration, n_cuts = extract_frames(video, out_dir, a.frames)
    meta["duree_s"] = meta.get("duree_s") or round(duration, 1)
    meta["nb_changements_de_plan"] = n_cuts
    meta["rythme_plans_par_10s"] = round(n_cuts / duration * 10, 1) if duration else None

    transcript, source_tr = None, "désactivée"
    if not a.no_transcript:
        print("🎙  Transcription de l'audio…")
        transcript, source_tr = transcribe(video, out_dir, a.lang, a.model)
        if transcript is not None:
            (out_dir / "transcript.txt").write_text(transcript)
    meta["source_transcription"] = source_tr
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    rel = out_dir.relative_to(ROOT)
    rapport = [f"# Analyse vidéo — {meta.get('titre') or meta.get('id')}", "",
               f"- **Plateforme** : {meta.get('plateforme')}",
               f"- **Lien** : {meta.get('url')}",
               f"- **Auteur** : {meta.get('auteur') or '—'}",
               f"- **Durée** : {meta['duree_s']} s",
               f"- **Format** : {meta.get('largeur') or '?'}×{meta.get('hauteur') or '?'}",
               f"- **Vues / likes / commentaires** : {meta.get('vues') or '—'} / "
               f"{meta.get('likes') or '—'} / {meta.get('commentaires') or '—'}",
               f"- **Changements de plan** : {n_cuts} (~{meta['rythme_plans_par_10s']} par 10 s)",
               f"- **Transcription** : {source_tr}", "",
               "## Description / légende", "", (meta.get("description") or "—").strip(), "",
               "## Images clés (à ouvrir avec Read)", ""]
    rapport += [f"- `{rel}/{f['fichier']}` — {f['seconde']} s" for f in frames]
    rapport += ["", "## Transcription", "", transcript or "—"]
    (out_dir / "rapport.md").write_text("\n".join(rapport))

    print(f"✅ Prêt : {rel}/rapport.md  ({len(frames)} images, transcription : {source_tr})")
    print(f"DOSSIER={out_dir}")


if __name__ == "__main__":
    main()
