# Entregables ER3 · BIGGER Ágil

- `Informe_Final_ER3_BIGGER.docx` (+ `.pdf`): informe final en 5 secciones: contexto socio comunitario, etapas del curso, qué viene después, competencias y conclusiones (con Canvas, empresa, misión, visión y valores). Lo marcado en amarillo entre corchetes `[COMPLETAR …]` es un dato que solo tiene el equipo o el socio.
- `Presentacion_Final_ER3_BIGGER.pptx`: presentación. La diapositiva 9 es un **recorrido interactivo**: ábrela en modo presentación y haz clic en los botones numerados o en «Simular el flujo completo»; los recuadros dorados avanzan el flujo (mesa, pedido, cocina, cobro). Las 14 pantallas de la simulación están ocultas y solo se abren con esos enlaces. Funciona en PowerPoint, Keynote y Google Slides.
- `figuras/`: logo de Mesa Abierta (claro y oscuro), árbol de problemas, Gantt y vista previa de la placa braille.
- `braille-stl/`: placas braille 3D generadas desde la carta de ejemplo, listas para un laminador (STL, milímetros).
- `estado.json`: qué módulos figuran como operativos y cuáles como pendientes en el informe y la presentación.
- `video-bigger-agil.mp4`: video del producto (87 s, 1080p, sin audio) con el sistema funcionando y el texto en pantalla. `guion-video.md` trae la locución escena por escena para grabarla encima.
- `video/`: scripts que generan el video. Con la base de ejemplo limpia (`pnpm db:reset`) y `pnpm dev` corriendo, desde esta carpeta: `node cards.cjs`, `VIDEO_PIN=<PIN local> node record.cjs` y `python3 build.py` (requiere Playwright, ffmpeg y Pillow).
