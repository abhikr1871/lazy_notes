import { jsPDF } from 'jspdf';

// 1. Export Topic Notes to Markdown (.md)
export function exportTopicToMarkdown(topicName, questions = []) {
    let md = `# 📚 ${topicName} — Lazzy DSA Study Cheat-Sheet\n\n`;
    md += `*Exported on: ${new Date().toLocaleDateString()}*\n\n`;
    md += `---\n\n`;

    if (questions.length === 0) {
        md += `*No notes saved under this topic yet.*\n`;
    } else {
        questions.forEach((q, index) => {
            md += `## ${index + 1}. ${q.title || 'Untitled Problem'}\n`;
            if (q.difficulty) md += `**Difficulty:** ${q.difficulty}\n`;
            if (q.url) md += `**URL:** [Problem Link](${q.url})\n`;
            md += `\n`;

            if (q.notes) {
                md += `### 📝 Notes & Intuition\n`;
                // Strip HTML tags for clean Markdown or keep basic text
                const textNotes = q.notes
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<[^>]+>/g, '');
                md += `${textNotes.trim()}\n\n`;
            }

            if (q.code) {
                md += `### 💻 Solution Code\n`;
                md += `\`\`\`${q.language || 'python'}\n`;
                md += `${q.code.trim()}\n`;
                md += `\`\`\`\n\n`;
            }

            md += `---\n\n`;
        });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topicName.replace(/\s+/g, '_')}_Lazzy_Notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Total Problems: ${questions.length}`, 14, y);
    y += 10;

    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 8;

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

        if (q.notes) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);

            const cleanNotes = q.notes.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const splitNotes = doc.splitTextToSize(`Notes: ${cleanNotes}`, 180);
            
            for (let i = 0; i < Math.min(splitNotes.length, 6); i++) {
                if (y > 275) { doc.addPage(); y = 15; }
                doc.text(splitNotes[i], 14, y);
                y += 5;
            }
            y += 2;
        }

        if (q.code) {
            if (y > 250) { doc.addPage(); y = 15; }
            doc.setFont("courier", "normal");
            doc.setFontSize(8);
            doc.setTextColor(16, 185, 129);

            const codeLines = q.code.split('\n');
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

    doc.save(`${topicName.replace(/\s+/g, '_')}_Lazzy_Notes.pdf`);
}
