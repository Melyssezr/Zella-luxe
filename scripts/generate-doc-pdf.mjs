/**
 * Generates ZELLA-LUXE-DOCUMENTATION.pdf from the markdown source.
 * Usage: node scripts/generate-doc-pdf.mjs
 */
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const ROOT = path.resolve(import.meta.dirname, "..");
const MD_PATH = path.join(ROOT, "ZELLA-LUXE-DOCUMENTATION.md");
const PDF_PATH = path.join(ROOT, "ZELLA-LUXE-DOCUMENTATION.pdf");

const PAGE = { margin: 50, width: 595.28, height: 841.89 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

const COLORS = {
  bg: "#ffffff",
  text: "#1a1a1a",
  muted: "#555555",
  gold: "#a07d3e",
  goldLight: "#c9a86c",
  border: "#dddddd",
  codeBg: "#f5f5f0",
};

function stripMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "");
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isTableSeparator(line) {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

async function createDoc() {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
    bufferPages: true,
    info: {
      Title: "Zella Luxe — Technical Documentation",
      Author: "Zella Luxe",
      Subject: "E-commerce platform documentation",
    },
  });

  const stream = fs.createWriteStream(PDF_PATH);
  doc.pipe(stream);

  let y = PAGE.margin;
  let pageNum = 1;

  function ensureSpace(needed) {
    if (y + needed > PAGE.height - PAGE.margin - 30) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = PAGE.margin;
    }
  }

  function addFooter() {
    const savedY = y;
    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Zella Luxe Documentation — Page ${pageNum}`, PAGE.margin, PAGE.height - PAGE.margin + 10, {
        width: CONTENT_WIDTH,
        align: "center",
      });
    y = savedY;
  }

  function drawLine(gap = 8) {
    ensureSpace(gap + 4);
    doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).stroke();
    y += gap;
  }

  function writeParagraph(text, opts = {}) {
    const fontSize = opts.fontSize ?? 10;
    const color = opts.color ?? COLORS.text;
    const font = opts.font ?? "Helvetica";
    const lineGap = opts.lineGap ?? 3;
    const indent = opts.indent ?? 0;

    doc.font(font).fontSize(fontSize).fillColor(color);
    const height = doc.heightOfString(text, { width: CONTENT_WIDTH - indent, lineGap });
    ensureSpace(height + 6);
    doc.text(text, PAGE.margin + indent, y, { width: CONTENT_WIDTH - indent, lineGap });
    y += height + 6;
  }

  function writeHeading(text, level) {
    const sizes = { 1: 22, 2: 16, 3: 13, 4: 11 };
    const size = sizes[level] ?? 11;
    const gap = level <= 2 ? 14 : 10;
    ensureSpace(size + gap + 4);
    if (level === 1) {
      doc.rect(PAGE.margin, y - 4, CONTENT_WIDTH, size + 8).fill("#faf8f4");
      y += 4;
    }
    doc
      .font(level <= 2 ? "Helvetica-Bold" : "Helvetica-Bold")
      .fontSize(size)
      .fillColor(level === 1 ? COLORS.gold : level === 2 ? COLORS.goldLight : COLORS.text);
    const h = doc.heightOfString(text, { width: CONTENT_WIDTH });
    doc.text(text, PAGE.margin, y, { width: CONTENT_WIDTH });
    y += h + gap;
    if (level <= 2) drawLine(6);
  }

  function writeBullet(text, depth = 0) {
    const indent = depth * 14 + 12;
    const bullet = depth === 0 ? "•" : "◦";
    writeParagraph(`${bullet}  ${text}`, { indent, fontSize: 10 });
  }

  function writeCodeBlock(lines) {
    const text = lines.join("\n");
    const fontSize = 8;
    doc.font("Courier").fontSize(fontSize);
    const height = doc.heightOfString(text, { width: CONTENT_WIDTH - 16, lineGap: 2 });
    ensureSpace(height + 16);
    doc.rect(PAGE.margin, y, CONTENT_WIDTH, height + 12).fill(COLORS.codeBg);
    doc.fillColor("#333333").text(text, PAGE.margin + 8, y + 6, { width: CONTENT_WIDTH - 16, lineGap: 2 });
    y += height + 16;
  }

  function writeTable(headers, rows) {
    const colCount = headers.length;
    const colWidth = CONTENT_WIDTH / colCount;
    const rowH = 18;
    const tableH = rowH * (rows.length + 1) + 4;
    ensureSpace(tableH + 8);

    // Header row
    doc.rect(PAGE.margin, y, CONTENT_WIDTH, rowH).fill(COLORS.gold);
    headers.forEach((h, i) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#ffffff")
        .text(stripMd(h), PAGE.margin + i * colWidth + 4, y + 5, { width: colWidth - 8, lineBreak: false });
    });
    y += rowH;

    rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? "#fafafa" : "#ffffff";
      doc.rect(PAGE.margin, y, CONTENT_WIDTH, rowH).fill(bg);
      row.forEach((cell, i) => {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.text)
          .text(stripMd(cell), PAGE.margin + i * colWidth + 4, y + 5, { width: colWidth - 8, lineBreak: false });
      });
      y += rowH;
    });
    y += 8;
  }

  // Cover page
  doc.rect(0, 0, PAGE.width, PAGE.height).fill("#0a0a0d");
  doc
    .font("Helvetica-Bold")
    .fontSize(32)
    .fillColor(COLORS.goldLight)
    .text("Zella Luxe", PAGE.margin, 200, { width: CONTENT_WIDTH, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(16)
    .fillColor("#f4f1ea")
    .text("Technical Documentation", PAGE.margin, 250, { width: CONTENT_WIDTH, align: "center" });
  doc
    .fontSize(11)
    .fillColor("#a29c92")
    .text("Luxury Women's E-Commerce Platform for Algeria", PAGE.margin, 290, { width: CONTENT_WIDTH, align: "center" });
  doc
    .fontSize(10)
    .fillColor(COLORS.gold)
    .text("https://zella-luxe.vercel.app", PAGE.margin, 330, { width: CONTENT_WIDTH, align: "center", link: "https://zella-luxe.vercel.app" });
  doc
    .fontSize(9)
    .fillColor("#666666")
    .text("French + Arabic  |  Next.js 16  |  PostgreSQL  |  Vercel", PAGE.margin, 370, {
      width: CONTENT_WIDTH,
      align: "center",
    });
  doc
    .fontSize(9)
    .fillColor("#555555")
    .text("July 2026", PAGE.margin, PAGE.height - 80, { width: CONTENT_WIDTH, align: "center" });

  addFooter();
  doc.addPage();
  pageNum++;
  y = PAGE.margin;

  const md = fs.readFileSync(MD_PATH, "utf8");
  const lines = md.split("\n");

  let i = 0;
  let inCode = false;
  let codeLines = [];
  let tableHeaders = null;
  let tableRows = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip cover duplicate title block at start of MD
    if (i < 5 && (trimmed.startsWith("# Zella Luxe") || trimmed === "---")) {
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      if (inCode) {
        writeCodeBlock(codeLines);
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      i++;
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      i++;
      continue;
    }

    if (trimmed.startsWith("|") && !isTableSeparator(trimmed)) {
      const cells = parseTableRow(trimmed);
      if (!tableHeaders) {
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      i++;
      // peek for separator
      if (i < lines.length && isTableSeparator(lines[i].trim())) i++;
      // continue collecting table rows
      if (i < lines.length && lines[i].trim().startsWith("|") && !isTableSeparator(lines[i].trim())) {
        continue;
      }
      if (tableHeaders && tableRows.length > 0) {
        writeTable(tableHeaders, tableRows);
      } else if (tableHeaders && tableRows.length === 0) {
        // single row table used as key-value
        writeTable(tableHeaders.slice(0, 2), []);
      }
      tableHeaders = null;
      tableRows = [];
      continue;
    }

    if (isTableSeparator(trimmed)) {
      i++;
      continue;
    }

    if (trimmed === "---") {
      drawLine(12);
      i++;
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      writeHeading(stripMd(trimmed.slice(5)), 4);
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      writeHeading(stripMd(trimmed.slice(4)), 3);
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      writeHeading(stripMd(trimmed.slice(3)), 2);
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      writeHeading(stripMd(trimmed.slice(2)), 1);
      i++;
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      writeBullet(stripMd(trimmed.slice(2)));
      i++;
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)[1];
      writeParagraph(`${num}. ${stripMd(trimmed.replace(/^\d+\.\s/, ""))}`, { fontSize: 10 });
      i++;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      writeParagraph(stripMd(trimmed.slice(2)), { color: COLORS.muted, indent: 12, fontSize: 9 });
      i++;
      continue;
    }

    if (trimmed === "") {
      y += 4;
      i++;
      continue;
    }

    // Skip mermaid blocks label only
    if (trimmed === "mermaid" || trimmed.startsWith("```mermaid")) {
      i++;
      continue;
    }

    writeParagraph(stripMd(trimmed), { fontSize: 10 });
    i++;
  }

  addFooter();

  // Page numbers on all pages
  const range = doc.bufferedPageRange();
  console.log(`Pages: ${range.count}`);
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(p);
    if (p === 0) continue; // cover
    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Page ${p} / ${range.count - 1}`, PAGE.margin, PAGE.height - PAGE.margin + 10, {
        width: CONTENT_WIDTH,
        align: "right",
      });
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const stats = fs.statSync(PDF_PATH);
  console.log(`PDF written: ${PDF_PATH}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
}

createDoc().catch((err) => {
  console.error(err);
  process.exit(1);
});
