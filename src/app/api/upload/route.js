import pdfParse from 'pdf-parse';

export const config = {
  api: { bodyParser: false },
};

async function processFile(file) {
  const fileName = file.name;
  const fileType = file.type || '';
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = fileName.split('.').pop()?.toLowerCase();

  // PDF
  if (fileType === 'application/pdf' || ext === 'pdf') {
    try {
      const pdf = await pdfParse(buffer);
      return {
        type: 'document',
        fileName,
        pageCount: pdf.numpages,
        content: pdf.text.slice(0, 100000),
      };
    } catch (e) {
      return { type: 'document', fileName, content: '[שגיאה בקריאת PDF]', error: e.message };
    }
  }

  // Images
  if (
    fileType.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'heif', 'svg'].includes(ext)
  ) {
    const mediaType = fileType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return {
      type: 'image',
      fileName,
      mediaType,
      base64: buffer.toString('base64'),
    };
  }

  // Word docs — extract what we can
  if (['doc', 'docx'].includes(ext) || fileType.includes('word') || fileType.includes('openxmlformats-officedocument')) {
    // Try to extract text from docx (it's a zip with XML)
    try {
      const text = buffer.toString('utf-8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 100000);
      return { type: 'document', fileName, content: text.length > 100 ? text : '[לא ניתן לחלץ טקסט מקובץ Word — נא להמיר ל-PDF]' };
    } catch {
      return { type: 'document', fileName, content: '[נא להמיר קובץ Word ל-PDF]' };
    }
  }

  // Excel
  if (['xlsx', 'xls'].includes(ext) || fileType.includes('spreadsheet') || fileType.includes('excel')) {
    return { type: 'document', fileName, content: '[קובץ Excel — נא להמיר ל-CSV או PDF לניתוח מיטבי]' };
  }

  // Text-based files — broad matching
  if (
    fileType.startsWith('text/') ||
    fileType === 'application/json' ||
    fileType === 'application/csv' ||
    fileType === 'application/xml' ||
    fileType === 'application/javascript' ||
    ['csv', 'txt', 'json', 'xml', 'html', 'htm', 'md', 'log', 'rtf', 'yaml', 'yml', 'tsv'].includes(ext)
  ) {
    return {
      type: 'document',
      fileName,
      content: buffer.toString('utf-8').slice(0, 100000),
    };
  }

  // Fallback — try to read as text
  try {
    const text = buffer.toString('utf-8');
    // Check if it's actually readable text (not binary garbage)
    const printable = text.slice(0, 500).replace(/[^\x20-\x7E\u0590-\u05FF\u0600-\u06FF\n\r\t]/g, '');
    if (printable.length > text.slice(0, 500).length * 0.5) {
      return { type: 'document', fileName, content: text.slice(0, 100000) };
    }
  } catch {}

  return { error: `לא ניתן לעבד את הקובץ ${fileName} (${fileType || ext})` };
}

export async function POST(request) {
  try {
    const formData = await request.formData();

    // Support multiple files — check for 'files' (multiple) and 'file' (single)
    const files = formData.getAll('file');

    if (!files.length) {
      return Response.json({ error: 'לא הועלו קבצים' }, { status: 400 });
    }

    // Process all files in parallel
    const results = await Promise.all(files.map(f => processFile(f)));

    // If single file, return single result (backward compatible)
    if (results.length === 1) {
      if (results[0].error) {
        return Response.json({ error: results[0].error }, { status: 400 });
      }
      return Response.json(results[0]);
    }

    // Multiple files — return array
    return Response.json({ files: results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
