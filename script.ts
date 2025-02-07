import { createCanvas, loadImage } from "canvas";
// @ts-ignore
import { writeFile } from "fs/promises";
import { forceSimulation, forceManyBody, forceLink } from "d3-force";
import forceBoundary from "d3-force-boundary";

// Utils & data
import rectangleForceCollide from "./rectangleForceCollide.ts";
import { labels, WIDTH, HEIGHT } from "./data/labels.ts";

const bbox = {
  x0: WIDTH * 0.35,
  y0: HEIGHT * 0.1,
  x1: WIDTH * 0.8,
  y1: HEIGHT * 0.25,
};

// Create nodes and links
const nodes: any = [];
const links: any = [];

labels.forEach((label, index) => {
  const originalNode = {
    pos: "start",
    id: `${label.id}-original`,
    x: label.x,
    y: label.y,
    // Lock the position of the original node
    // In future if there's a degree of movement allowed
    // i.e. column can be labelled anywhere along the column face
    // we can unconstrain one of these
    fx: label.x,
    fy: label.y,
  };

  const endNode = {
    pos: "end",
    id: `${label.id}`,
    x: label.x,
    y: label.y,
    width: label.width,
    height: label.height,
  };
  const halfwayNode = {
    pos: "halfway",
    id: `${label.id}-halfway`,
    x: (label.x + (bbox.x0 + bbox.x1) / 2) / 2,
    y: (label.y + (bbox.y0 + bbox.y1) / 2) / 2,
  };

  nodes.push(originalNode, halfwayNode, endNode);
  links.push(
    { source: originalNode.id, target: halfwayNode.id },
    { source: halfwayNode.id, target: endNode.id }
  );
});

const simulation = forceSimulation(nodes)
  // multi-leader line should be attracted to each other
  .force(
    "link",
    forceLink(links).id((d) => d.id)
  )
  // Keeps each annotation line away from each other
  // Increase the strength of this so its always maintained
  // https://observablehq.com/@d3/disjoint-force-directed-graph/2
  .force("charge", forceManyBody().strength(-1000))
  .force("collide", rectangleForceCollide())
  // https://observablehq.com/@roblallier/rectangle-collision-force
  .force("boundary", forceBoundary(bbox.x0, bbox.y0, bbox.x1, bbox.y1))
  .stop();

simulation.tick(50);

// RENDER
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

const image = await loadImage("assets/blank_img.png");
ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

ctx.fillStyle = "blue";
ctx.strokeStyle = "red";
ctx.lineWidth = 2;

ctx.rect(bbox.x0, bbox.y0, bbox.x1 - bbox.x0, bbox.y1 - bbox.y0);
ctx.stroke();
nodes.forEach((node) => {
  ctx.fillStyle = node.fixed ? "red" : "blue";
  ctx.beginPath();
  ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
  ctx.fill();

  if (node.pos === "end") {
    // Draw rectangle with x and y starting from bottom left
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.strokeRect(node.x, node.y - node.height, node.width, node.height);

    // Final positions (Red)
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw the label text
    ctx.font = "24px Arial";
    ctx.textBaseline = "bottom";
    ctx.fillText(node.id, node.x, node.y);
  }
});

links.forEach((link) => {
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(link.source.x, link.source.y);
  ctx.lineTo(link.target.x, link.target.y);
  ctx.stroke();
});

const buffer = canvas.toBuffer("image/png");
await writeFile(new URL("./out/output.png", import.meta.url), buffer);
