// Turns CV data into LaTeX for pdfLaTeX. The layout follows what hiring
// systems read best: one column, standard section headings, plain text for
// every detail (no icons, tables or text boxes), and a PDF whose text copies
// out cleanly (glyphtounicode). Everything the person typed is escaped, so it
// can only ever be text, never LaTeX commands.

import type { CvData, CvSection } from "./model";

const SPECIALS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "^": "\\textasciicircum{}",
  _: "\\_",
  "%": "\\%",
  "~": "\\textasciitilde{}",
  "<": "\\textless{}",
  ">": "\\textgreater{}",
  "|": "\\textbar{}",
};

/**
 * Characters pdfLaTeX can typeset with the fonts used here: Latin letters and
 * accents, general punctuation (dashes, quotes, ellipsis) and a few symbols.
 * Anything else is left out of the PDF; the suggestions point it out.
 */
export function unsupportedCharacters(value: string): string[] {
  const found = new Set<string>();
  for (const char of value) {
    const code = char.codePointAt(0)!;
    const ok =
      code === 0x0a ||
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0x024f) ||
      (code >= 0x2010 && code <= 0x2027) ||
      code === 0x2030 ||
      code === 0x20ac ||
      code === 0x2122;
    if (!ok) found.add(char);
  }
  return [...found];
}

/** Escapes plain text for LaTeX and drops characters it can't typeset. */
export function esc(value: string): string {
  let out = "";
  for (const char of value.replace(/\r/g, "")) {
    if (unsupportedCharacters(char).length > 0) continue;
    if (char in SPECIALS) out += SPECIALS[char];
    else if (char === "\u2022") out += "\\textbullet{}";
    else if (char === "\u2122") out += "\\texttrademark{}";
    else if (char === "\u20ac") out += "\\texteuro{}";
    else out += char;
  }
  // Straight double quotes read better as typographic ones.
  return out.replace(/"([^"]*)"/g, "``$1''").replace(/"/g, "''");
}

/** A URL for \href's first argument: only web and mail links, with the characters hyperref needs escaped. */
export function safeUrl(value: string): string | null {
  const url = value.trim();
  if (!url) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  if (!/^(https?:|mailto:)/i.test(withScheme)) return null;
  if (/[\s{}\\]/.test(withScheme) || unsupportedCharacters(withScheme).length > 0) return null;
  return withScheme.replace(/%/g, "\\%").replace(/#/g, "\\#");
}

/** How a link reads on the page: the address itself, without the scheme. Recruiters and parsers both read it. */
const displayUrl = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^mailto:/i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");

/** Pasted bullets often keep their own bullet characters; the list adds one already. */
const bulletText = (value: string) => value.trim().replace(/^[\u2022\u2023\u25e6\u2043\u2219*•·\-–—]\s*/, "");

const dateRange = (start: string, end: string, current: boolean) => {
  const to = current ? "Present" : end.trim();
  const from = start.trim();
  if (from && to) return `${esc(from)} -- ${esc(to)}`;
  return esc(from || to);
};

function bulletList(items: string[]) {
  const lines = items.map(bulletText).filter(Boolean);
  if (lines.length === 0) return "";
  return ["\\begin{itemize}", ...lines.map((line) => `  \\item ${esc(line)}`), "\\end{itemize}"].join("\n");
}

/** Two pieces on one line, the second pushed right: "Role ... Jan 2022 -- Present". */
const row = (left: string, right: string) => (right ? `${left}\\hfill ${right}\\par` : `${left}\\par`);

function renderSection(section: CvSection): string {
  const out: string[] = [`\\cvsection{${esc(section.title || "Untitled")}}`];
  switch (section.type) {
    case "experience":
    case "education":
      for (const item of section.items) {
        const title = "role" in item ? item.role : item.degree;
        const empty = !title.trim() && !item.organisation.trim() && item.bullets.every((bullet) => !bullet.text.trim());
        if (empty) continue;
        out.push("\\begin{cventry}");
        out.push(row(`\\textbf{${esc(title)}}`, dateRange(item.start, item.end, item.current)));
        if (item.organisation.trim() || item.location.trim()) out.push(row(esc(item.organisation), item.location.trim() ? `\\textit{${esc(item.location)}}` : ""));
        const bullets = bulletList(item.bullets.map((bullet) => bullet.text));
        if (bullets) out.push(bullets);
        out.push("\\end{cventry}");
      }
      break;
    case "projects":
      for (const item of section.items) {
        if (!item.name.trim() && item.bullets.every((bullet) => !bullet.text.trim())) continue;
        const url = safeUrl(item.link);
        out.push("\\begin{cventry}");
        out.push(row(`\\textbf{${esc(item.name)}}`, url ? `\\href{${url}}{${esc(displayUrl(item.link))}}` : ""));
        const bullets = bulletList(item.bullets.map((bullet) => bullet.text));
        if (bullets) out.push(bullets);
        out.push("\\end{cventry}");
      }
      break;
    case "skills":
      for (const group of section.groups) {
        if (!group.skills.trim()) continue;
        out.push(group.label.trim() ? `\\textbf{${esc(group.label)}:} ${esc(group.skills)}\\par` : `${esc(group.skills)}\\par`);
      }
      break;
    default: {
      const list = bulletList(section.items.map((item) => item.text));
      if (list) out.push(list);
    }
  }
  // A heading with nothing under it is left out.
  return out.length > 1 ? out.join("\n") : "";
}

function renderRemote(cv: CvData): string {
  const { timezone, hours, authorization, experience } = cv.remote;
  const lines = [
    timezone.trim() && `\\textbf{Time zone:} ${esc(timezone)}\\par`,
    hours.trim() && `\\textbf{Working hours:} ${esc(hours)}\\par`,
    authorization.trim() && `\\textbf{Work authorization:} ${esc(authorization)}\\par`,
    experience.trim() && `${esc(experience)}\\par`,
  ].filter(Boolean);
  return lines.length > 0 ? ["\\cvsection{Remote Work}", ...lines].join("\n") : "";
}

const PREAMBLE: Record<CvData["design"]["template"], string> = {
  classic: String.raw`\usepackage{lmodern}
\newcommand{\cvsection}[1]{\par\vspace{9pt}{\large\scshape #1}\par\vspace{2pt}\hrule height 0.5pt\relax\vspace{5pt}}`,
  modern: String.raw`\usepackage{lmodern}
\renewcommand{\familydefault}{\sfdefault}
\newcommand{\cvsection}[1]{\par\vspace{9pt}{\large\bfseries #1}\par\vspace{2pt}\hrule height 0.6pt\relax\vspace{5pt}}`,
};

export function cvToLatex(cv: CvData): string {
  const { basics, design } = cv;
  const classSize = design.fontSize === "11" ? "11pt" : "10pt";
  const paper = design.paper === "letter" ? "letterpaper" : "a4paper";
  const margin = design.paper === "letter" ? "0.6in" : "1.6cm";

  const contact = [
    basics.email.trim() && (safeUrl(`mailto:${basics.email.trim()}`) ? `\\href{${safeUrl(`mailto:${basics.email.trim()}`)}}{${esc(basics.email.trim())}}` : esc(basics.email)),
    basics.phone.trim() && esc(basics.phone),
    basics.location.trim() && esc(basics.location),
    ...basics.links.map((link) => {
      const url = safeUrl(link.url);
      return url ? `\\href{${url}}{${esc(displayUrl(link.url))}}` : "";
    }),
  ].filter(Boolean);

  const summary = basics.summary
    .split(/\n\s*\n/)
    .map((paragraph) => esc(paragraph.replace(/\s*\n\s*/g, " ").trim()))
    .filter(Boolean);

  const body = [
    "\\begin{center}",
    `  {\\LARGE\\bfseries ${esc(basics.name || "Your Name")}}\\par`,
    basics.headline.trim() && `  \\vspace{3pt}{\\large ${esc(basics.headline)}}\\par`,
    // Each detail stays whole, and a separator vanishes where the line wraps,
    // so no line starts or ends with a stray bar.
    contact.length > 0 &&
      `  \\vspace{4pt}{\\small ${contact.map((item) => `\\mbox{${item}}`).join("\\discretionary{}{}{\\enspace\\textbar\\enspace}")}}\\par`,
    "\\end{center}",
    summary.length > 0 && ["\\cvsection{Summary}", summary.join("\\par\n")].join("\n"),
    renderRemote(cv),
    ...cv.sections.map(renderSection),
  ].filter(Boolean);

  const title = `${basics.name || "CV"} - CV`;
  return String.raw`% Made with the RemoteJobs CV maker. Compiles with pdfLaTeX (for example on Overleaf).
\documentclass[${classSize},${paper}]{article}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[margin=${margin}]{geometry}
\usepackage[hidelinks]{hyperref}
\usepackage{enumitem}
${PREAMBLE[design.template]}
% Lets hiring systems copy the text out of the PDF exactly as written.
\input{glyphtounicode}
\pdfgentounicode=1
\hypersetup{pdftitle={${esc(title)}},pdfauthor={${esc(basics.name)}}}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\raggedright
\setlist[itemize]{leftmargin=1.1em,itemsep=1.5pt,topsep=2pt,parsep=0pt,partopsep=0pt}
\newenvironment{cventry}{\par\vspace{3pt}}{\par\vspace{4pt}}

\begin{document}
${design.fontSize === "10.5" ? "\\fontsize{10.5pt}{12.9pt}\\selectfont\n" : ""}${body.join("\n\n")}
\end{document}
`;
}
