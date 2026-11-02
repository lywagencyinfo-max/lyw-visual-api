# Iris — Agent inspiration vidéo · Agent IA (template)

Donne à Claude un lien **Instagram, YouTube, Facebook ou TikTok** : Iris télécharge la vidéo, en extrait les **images clés** (début + chaque changement de plan), **transcrit l'audio**, puis l'analyse (hook, structure, montage, style, script, CTA) et te propose **3 idées de contenus originaux** inspirés.

## Démarrer

1. Installe **Python 3** et **ffmpeg** (Mac : `brew install ffmpeg`).
2. Ouvre **ce dossier** dans Claude Code.
3. ```bash
   pip install -r requirements.txt
   ```
4. Écris simplement à Claude :
   > Inspire-toi de cette vidéo pour un reel LYW pilier Visibility : https://www.instagram.com/reel/XXXX/

## Comment ça marche

| Étape | Outil |
|---|---|
| Téléchargement + métadonnées (titre, légende, vues, likes) | `yt-dlp` |
| Images clés (hook, intervalles réguliers, changements de plan) | `ffmpeg` |
| Transcription (sous-titres de la plateforme, sinon Whisper local) | `faster-whisper` |
| Analyse visuelle + idées | l'agent `video-inspiration` (Claude lit les images) |

Tu peux aussi lancer l'analyse à la main :

```bash
python tools/analyse_video.py "https://www.tiktok.com/@compte/video/123" --frames 16
python tools/analyse_video.py ma_video.mp4        # fichier local
```

Résultat dans `videos/<plateforme-id>/` : `rapport.md`, `frames/`, `transcript.txt`, `meta.json`.

## Si un lien ne passe pas

- **Instagram / Facebook** demandent souvent d'être connecté : ajoute `--cookies-from-browser chrome` (ou `firefox`, `safari`) — Iris le fait d'elle-même si besoin.
- Les plateformes changent souvent : `pip install -U yt-dlp`.
- Vidéo privée = impossible à lire.

## ⚠️ Inspiration, pas copie

Iris reprend les **mécaniques** (format, rythme, type de hook, structure) et crée des contenus originaux. Les vidéos téléchargées restent sur ton ordinateur (`videos/`, ignoré par git) et ne doivent pas être republiées.
