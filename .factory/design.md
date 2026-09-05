# Linebreak Clash visual thesis

## Direction

Linebreak Clash uses a **screen-printed transit blueprint** direction. The arena
looks like a physical relay map marked by two competing route pens. Fine grid
lines explain movement and distance. Numbered relay stamps make the objective
legible without relying on color. Misregistered shadows, clipped corners, and
ink-like trails give the product a recognizable print character without
obscuring play.

This is deliberately a single light treatment. An ivory arena keeps both trail
colors and collision geometry readable in daylight, while a navy page surround
reduces glare around the canvas. The game paints every background explicitly.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#f3eddf` | arena and primary surface |
| Paper deep | `#ded4bf` | grid and inactive controls |
| Ink | `#10233d` | page background, text, outlines |
| Ink muted | `#526174` | secondary text on paper |
| Cobalt | `#0759c7` | player one and primary actions |
| Vermilion | `#c73b2f` | player two and urgent state |
| Violet | `#6a3fc7` | online player three |
| Forest | `#16705a` | online player four |
| Relay | `#d7f13b` | neutral capture target |
| Success | `#146343` | restored/saved feedback |

All body text and controls meet 4.5:1 contrast. Color is always paired with a
player number, label, shape, or texture.

## Type and spacing

The product uses local system faces, so it requests no font files. Display text
uses the condensed `Arial Narrow`/`Aptos Narrow` system stack in uppercase-like
compact forms. Body text uses `Inter` when installed and then the platform UI
stack. The 16 px body base and a 1.25 type scale keep the dense HUD readable.
Spacing follows an 8 px rhythm with 4 px optical corrections.

## Shape and interaction grammar

Controls use clipped lower-right corners, 2 px ink borders, and a 3 px offset
print shadow. Pressing a control closes the offset. Relay nodes use concentric
rings and large numbers. Player one is a circle with a solid cobalt trail;
player two is a diamond with a vermilion trail broken by short print gaps.
Online players three and four add violet and green route ink. Each player also
has a written name, connection state, and score, so color never carries state
alone.

The first screen is asymmetric: instructions occupy a narrow dispatch column
and the live arena takes the larger field. On phones the dispatch column stacks
above a wide, shallow arena; touch steering stays below the canvas.

## Motion policy

The simulation uses a fixed 60 Hz step and interpolated `requestAnimationFrame`
rendering. Captures use one 220 ms expanding ring. Controls compress for 100 ms.
There is no screen shake. Reduced-motion mode removes capture rings, button
travel, and panel transitions while retaining gameplay movement required to
play. The tab pauses the loop when hidden.

## Difficulty curve

Solo mode starts with a bot that chooses the nearest active relay and turns at
a capped rate. It gains the same dash cooldown as the player. Temporary trails
remain for eight seconds, so the arena becomes more constrained through the
middle of each 90-second round and then clears continuously. Assist mode slows
both players by 18% and widens safe spawn clearance.

Online mode uses the same rules on the room service. Its fixed-step simulation
is authoritative, and browsers only send steering and dash input. A completed
room keeps the same group together for one-button rematches.

## Asset plan and provenance

All visual assets are original, hand-authored vectors or procedural Canvas 2D
geometry made for this product on 2026-09-05. This includes the arena grid,
relay stamps, player marks, favicon, social card, and 404 illustration. No stock,
third-party, generated raster, brand, or copyrighted character asset is used.
Raster generation was intentionally skipped because exact procedural geometry
communicates collision state better and keeps the initial payload small.
