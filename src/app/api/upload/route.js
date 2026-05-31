import { NextResponse } from 'next/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// ─── Parsers (dynamic imports to avoid Vercel bundling issues) ───

async function parsePDF(buffer) {
  const pdfParse = (await import('pdf-parse')).default;
  const pdf = await pdfParse(buffer);
  return { text: pdf.text, numpages: pdf.numpages };
}

async function parseWord(buffer) {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function parseExcel(buffer) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`=== גיליון: ${name} ===\n${csv}`);
  }
  return sheets.join('\n\n');
}

// ─── Process a single file ───

async function processFile(file) {
  const fileName = file.name;
  const fileType = file.type || '';
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = fileName.split('.').pop()?.toLowerCase();

  // ── PDF ──
  if (fileType === 'application/pdf' || ext === 'pdf') {
    try {
      const pdf = await parsePDF(buffer);
      return {
        type: 'document',
        fileName,
        pageCount: pdf.numpages,
        content: pdf.text.slice(0, 100000),
      };
    } catch (e) {
      return { type: 'document', fileName, content: `[שגיאה בקריאת PDF: ${e.message}]` };
    }
  }

  // ── Images (all formats → Claude vision) ──
  if (
    fileType.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif', 'svg', 'ico', 'avif'].includes(ext)
  ) {
    // Claude supports jpeg, png, gif, webp — convert media type for compatibility
    let mediaType = fileType;
    if (!mediaType || mediaType === 'application/octet-stream') {
      const extMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff', heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml', ico: 'image/x-icon', avif: 'image/avif' };
      mediaType = extMap[ext] || 'image/png';
    }
    return {
      type: 'image',
      fileName,
      mediaType,
      base64: buffer.toString('base64'),
    };
  }

  // ── Word documents (.docx, .doc) ──
  if (
    ['docx'].includes(ext) ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const text = await parseWord(buffer);
      return { type: 'document', fileName, content: text.slice(0, 100000) };
    } catch (e) {
      return { type: 'document', fileName, content: `[שגיאה בקריאת Word: ${e.message}]` };
    }
  }

  if (ext === 'doc' || fileType === 'application/msword') {
    // Old .doc format — mammoth might handle some, try it
    try {
      const text = await parseWord(buffer);
      if (text.length > 50) {
        return { type: 'document', fileName, content: text.slice(0, 100000) };
      }
    } catch {}
    return { type: 'document', fileName, content: '[קובץ .doc ישן — נא לשמור כ-.docx או PDF]' };
  }

  // ── Excel (.xlsx, .xls, .xlsm) ──
  if (
    ['xlsx', 'xls', 'xlsm', 'xlsb'].includes(ext) ||
    fileType.includes('spreadsheet') ||
    fileType.includes('excel')
  ) {
    try {
      const text = await parseExcel(buffer);
      return { type: 'document', fileName, content: text.slice(0, 100000) };
    } catch (e) {
      return { type: 'document', fileName, content: `[שגיאה בקריאת Excel: ${e.message}]` };
    }
  }

  // ── PowerPoint (.pptx) ──
  if (
    ['pptx'].includes(ext) ||
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    // Extract text from pptx (it's a zip with XML slides)
    try {
      const XLSX = await import('xlsx');
      // pptx is a zip — try to read xml content
      const text = buffer.toString('utf-8');
      const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 100) {
        return { type: 'document', fileName, content: cleaned.slice(0, 100000) };
      }
    } catch {}
    // Fallback: send as image so Claude can try to read it
    return { type: 'document', fileName, content: '[קובץ PowerPoint — נא להמיר ל-PDF לניתוח מיטבי]' };
  }

  // ── CSV / TSV ──
  if (['csv', 'tsv'].includes(ext) || fileType === 'text/csv' || fileType === 'text/tab-separated-values') {
    return {
      type: 'document',
      fileName,
      content: buffer.toString('utf-8').slice(0, 100000),
    };
  }

  // ── Rich Text (.rtf) ──
  if (ext === 'rtf' || fileType === 'application/rtf' || fileType === 'text/rtf') {
    const text = buffer.toString('utf-8')
      .replace(/\\[a-z]+\d*\s?/g, '') // strip RTF commands
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return { type: 'document', fileName, content: text.slice(0, 100000) };
  }

  // ── HTML ──
  if (['html', 'htm', 'mhtml', 'mht'].includes(ext) || fileType === 'text/html') {
    const text = buffer.toString('utf-8')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    return { type: 'document', fileName, content: text.slice(0, 100000) };
  }

  // ── Emails (.eml) ──
  if (ext === 'eml' || fileType === 'message/rfc822') {
    const text = buffer.toString('utf-8');
    return { type: 'document', fileName, content: text.slice(0, 100000) };
  }

  // ── JSON ──
  if (ext === 'json' || fileType === 'application/json') {
    try {
      const parsed = JSON.parse(buffer.toString('utf-8'));
      return { type: 'document', fileName, content: JSON.stringify(parsed, null, 2).slice(0, 100000) };
    } catch {
      return { type: 'document', fileName, content: buffer.toString('utf-8').slice(0, 100000) };
    }
  }

  // ── XML ──
  if (['xml', 'xsl', 'xslt', 'svg'].includes(ext) || fileType.includes('xml')) {
    return { type: 'document', fileName, content: buffer.toString('utf-8').slice(0, 100000) };
  }

  // ── Code files ──
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'sql', 'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'makefile', 'dockerfile', 'tf', 'hcl', 'vue', 'svelte'];
  if (codeExts.includes(ext)) {
    return { type: 'document', fileName, content: buffer.toString('utf-8').slice(0, 100000) };
  }

  // ── Config / Data files ──
  const configExts = ['yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'properties', 'gitignore', 'editorconfig', 'eslintrc', 'prettierrc', 'babelrc'];
  if (configExts.includes(ext)) {
    return { type: 'document', fileName, content: buffer.toString('utf-8').slice(0, 100000) };
  }

  // ── Markdown / Text ──
  if (['md', 'markdown', 'txt', 'text', 'log', 'nfo', 'readme'].includes(ext) || fileType.startsWith('text/')) {
    return { type: 'document', fileName, content: buffer.toString('utf-8').slice(0, 100000) };
  }

  // ── Fallback: try reading as text ──
  try {
    const text = buffer.toString('utf-8');
    const sample = text.slice(0, 1000);
    // Count printable characters (Latin, Hebrew, Arabic, common symbols)
    const printable = sample.replace(/[^\x20-\x7E\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u4e00-\u9fff\n\r\t]/g, '');
    if (printable.length > sample.length * 0.4) {
      return { type: 'document', fileName, content: text.slice(0, 100000) };
    }
  } catch {}

  // ── Last resort: send as image for Claude to try to OCR / analyze ──
  // This handles scanned documents, weird formats, etc.
  const base64 = buffer.toString('base64');
  if (base64.length < 10_000_000) { // under ~7.5MB
    return {
      type: 'image',
      fileName,
      mediaType: 'application/octet-stream',
      base64,
      note: 'קובץ לא מזוהה — נשלח ל-AI לניסיון ניתוח',
    };
  }

  return { error: `הקובץ ${fileName} גדול מדי או בפורמט לא נתמך (${fileType || ext})` };
}

// ─── Route handler ───

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('file');

    if (!files.length) {
      return NextResponse.json({ error: 'לא הועלו קבצים' }, { status: 400 });
    }

    const results = await Promise.all(files.map(f => processFile(f)));

    if (results.length === 1) {
      if (results[0].error && !results[0].type) {
        return NextResponse.json({ error: results[0].error }, { status: 400 });
      }
      return NextResponse.json(results[0]);
    }

    return NextResponse.json({ files: results });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: `שגיאה בעיבוד הקובץ: ${error.message}` }, { status: 500 });
  }
}
