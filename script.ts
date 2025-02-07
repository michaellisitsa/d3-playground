import { createCanvas, loadImage } from "canvas";
// @ts-ignore
import { writeFile } from "fs/promises";
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";
import rectangleForceCollide from "./rectangleForceCollide.ts";
import forceBoundary from "d3-force-boundary";
const WIDTH = 1000;
const HEIGHT = 750;

const CHAR_WIDTH = 20;
const LINE_HEIGHT = 20;

const labels = [
  {
    id: "HSS Column",
    x: WIDTH * 0.3,
    y: HEIGHT * 0.28,
    width: CHAR_WIDTH * 10,
    height: LINE_HEIGHT,
  },
  {
    id: "Through Plate",
    x: WIDTH * 0.34,
    y: HEIGHT * 0.38,
    width: CHAR_WIDTH * 13,
    height: LINE_HEIGHT,
  },
  {
    id: "Beam",
    x: WIDTH * 0.5,
    y: HEIGHT * 0.32,
    width: CHAR_WIDTH * 5,
    height: LINE_HEIGHT,
  },
  {
    id: "16 mm Ø Bolt",
    x: WIDTH * 0.36,
    y: HEIGHT * 0.467,
    width: CHAR_WIDTH * 12,
    height: LINE_HEIGHT,
  },
  {
    id: "1623 mm Ø Bolt",
    x: WIDTH * 0.336,
    y: HEIGHT * 0.4367,
    width: CHAR_WIDTH * 12,
    height: LINE_HEIGHT,
  },
];

const originalPositions = labels.map((d) => ({ id: d.id, x: d.x, y: d.y }));
const bbox = {
  x0: WIDTH * 0.35,
  y0: HEIGHT * 0.1,
  x1: WIDTH * 0.8,
  y1: HEIGHT * 0.25,
  get cx() {
    return (this.x0 + this.x1) / 2;
  },
  get cy() {
    return (this.y0 + this.y1) / 2;
  },
};

const simulation = forceSimulation(labels)
  // https://observablehq.com/@john-guerra/d3-force-boundary
  .force("boundary", forceBoundary(bbox.x0, bbox.y0, bbox.x1, bbox.y1))
  // // https://observablehq.com/@roblallier/rectangle-collision-force
  .force("collide", rectangleForceCollide())
  // TODO: Links within disjointed graphs should not cross over
  // https://observablehq.com/@d3/disjoint-force-directed-graph/2
  .stop();

simulation.tick(30);

const positionsComparison = originalPositions.map((original, index) => ({
  id: original.id,
  originalX: original.x,
  originalY: original.y,
  finalX: labels[index].x,
  finalY: labels[index].y,
}));

// RENDER
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

const image = await loadImage("diagram_alpha.png");
ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

ctx.fillStyle = "blue";
ctx.strokeStyle = "red";
ctx.lineWidth = 2;

ctx.rect(bbox.x0, bbox.y0, bbox.x1 - bbox.x0, bbox.y1 - bbox.y0);
ctx.stroke();

positionsComparison.forEach((d, idx) => {
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(d.originalX, d.originalY);
  ctx.lineTo(d.finalX, d.finalY);
  ctx.stroke();

  // Final positions (Red)
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(d.finalX, d.finalY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw the label text
  ctx.font = "24px Arial";
  ctx.textBaseline = "bottom";
  ctx.fillText(d.id, d.finalX, d.finalY);

  // Draw rectangle with x and y starting from bottom left
  const label = labels.find((label) => label.id === d.id);
  if (label) {
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      d.finalX,
      d.finalY - label.height,
      label.width,
      label.height
    );
  }
});

const buffer = canvas.toBuffer("image/png");
await writeFile(new URL("./output.png", import.meta.url), buffer);
