import { jsPDF } from 'jspdf';

function triggerDownload(dataUri, fileName) {
    try {
        if (typeof chrome !== 'undefined' && chrome.downloads && typeof chrome.downloads.download === 'function') {
            chrome.downloads.download({
                url: dataUri,
                filename: fileName,
                saveAs: true
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.warn("chrome.downloads error, fallback to anchor:", chrome.runtime.lastError);
                    fallbackAnchorDownload(dataUri, fileName);
                }
            });
            return;
        }
    } catch (e) {
        console.warn("chrome.downloads exception:", e);
    }

    fallbackAnchorDownload(dataUri, fileName);
}

function fallbackAnchorDownload(dataUri, fileName) {
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
}

// 1. Export Topic Notes to Markdown (.md)
export function exportTopicToMarkdown(topicName, questions = []) {
    let md = `# 📚 ${topicName} — Lazzy DSA Study Cheat-Sheet\n\n`;
    md += `*Exported on: ${new Date().toLocaleDateString()}*\n\n`;
    md += `---\n\n`;

    if (!questions || questions.length === 0) {
        md += `### ${topicName} Overview\n`;
        md += `*Topic created in Lazzy extension. Add problem notes under this topic to generate full cheat-sheets.*\n`;
    } else {
        questions.forEach((q, index) => {
            md += `## ${index + 1}. ${q.title || 'Untitled Problem'}\n`;
            if (q.difficulty) md += `**Difficulty:** ${q.difficulty}\n`;
            if (q.url) md += `**URL:** [Problem Link](${q.url})\n`;
            md += `\n`;

            const notes = q.notes || q.note_content;
            if (notes) {
                md += `### 📝 Notes & Intuition\n`;
                const textNotes = notes
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<[^>]+>/g, '');
                md += `${textNotes.trim()}\n\n`;
            }

            const code = q.code || q.code_snippet;
            if (code) {
                md += `### 💻 Solution Code\n`;
                md += `\`\`\`${q.language || 'python'}\n`;
                md += `${code.trim()}\n`;
                md += `\`\`\`\n\n`;
            }

            md += `---\n\n`;
        });
    }

    const encoded = encodeURIComponent(md);
    const dataUri = `data:text/markdown;charset=utf-8,${encoded}`;
    const fileName = `${topicName.replace(/\s+/g, '_')}_Lazzy_Notes.md`;
    triggerDownload(dataUri, fileName);
}

// 2. Export Topic Notes to PDF (.pdf)
export function exportTopicToPDF(topicName, questions = []) {
    const doc = new jsPDF();
    let y = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`${topicName} - Lazzy Notes Cheat-Sheet`, 14, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Total Problems: ${questions ? questions.length : 0}`, 14, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 8;

    if (!questions || questions.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text(`Topic created in Lazzy extension. Add problem notes to populate cheat-sheet.`, 14, y);
    } else {
        questions.forEach((q, idx) => {
            if (y > 270) {
                doc.addPage();
                y = 15;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            const titleText = `${idx + 1}. ${q.title || 'Untitled Problem'} (${q.difficulty || 'Medium'})`;
            doc.text(titleText, 14, y);
            y += 7;

            const notes = q.notes || q.note_content;
            if (notes) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.setTextColor(71, 85, 105);

                const cleanNotes = notes.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                const splitNotes = doc.splitTextToSize(`Notes: ${cleanNotes}`, 180);

                for (let i = 0; i < Math.min(splitNotes.length, 6); i++) {
                    if (y > 275) { doc.addPage(); y = 15; }
                    doc.text(splitNotes[i], 14, y);
                    y += 5;
                }
                y += 2;
            }

            const code = q.code || q.code_snippet;
            if (code) {
                if (y > 250) { doc.addPage(); y = 15; }
                doc.setFont("courier", "normal");
                doc.setFontSize(8);
                doc.setTextColor(16, 185, 129);

                const codeLines = code.split('\n');
                for (let i = 0; i < Math.min(codeLines.length, 10); i++) {
                    if (y > 275) { doc.addPage(); y = 15; }
                    doc.text(codeLines[i].substring(0, 85), 14, y);
                    y += 4;
                }
            }

            y += 6;
            doc.setDrawColor(240);
            doc.line(14, y, 196, y);
            y += 6;
        });
    }

    const fileName = `${topicName.replace(/\s+/g, '_')}_Lazzy_Notes.pdf`;
    try {
        const dataUri = doc.output('datauristring');
        triggerDownload(dataUri, fileName);
    } catch (e) {
        console.error("PDF datauri generation failed:", e);
        doc.save(fileName);
    }
}
