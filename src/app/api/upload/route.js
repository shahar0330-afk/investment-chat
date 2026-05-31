import pdfParse from 'pdf-parse';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'לא הועלה קובץ' }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = file.type;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // PDF — extract text
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const pdf = await pdfParse(buffer);
      const text = pdf.text.slice(0, 100000); // limit to 100K chars
      return Response.json({
        type: 'document',
        fileName,
        pageCount: pdf.numpages,
        content: text,
      });
    }

    // Images — return as base64 for Claude vision
    if (fileType.startsWith('image/')) {
      const base64 = buffer.toString('base64');
      const mediaType = fileType; // image/jpeg, image/png, etc.
      return Response.json({
        type: 'image',
        fileName,
        mediaType,
        base64,
      });
    }

    // Text/CSV/JSON — read as text
    if (
      fileType.startsWith('text/') ||
      fileType === 'application/json' ||
      fileType === 'application/csv' ||
      fileName.endsWith('.csv') ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.json')
    ) {
      const text = buffer.toString('utf-8').slice(0, 100000);
      return Response.json({
        type: 'document',
        fileName,
        content: text,
      });
    }

    // Excel — basic support (read as text won't work, inform user)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return Response.json({
        error: 'קבצי Excel לא נתמכים כרגע. נא להמיר ל-PDF או CSV',
      }, { status: 400 });
    }

    return Response.json({
      error: `סוג קובץ לא נתמך: ${fileType}. נתמכים: PDF, תמונות, CSV, TXT`,
    }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
