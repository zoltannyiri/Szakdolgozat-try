// import express from 'express';
// import drive from '../utils/drive';

// const router = express.Router();

// router.get('/files/:id', async (req, res) => {
//   try {
//     const fileId = req.params.id;

//     // név, típus, méret lekérdezése
//     const meta = await drive.files.get({
//       fileId,
//       fields: 'name,mimeType,size',
//     });

//     const name = meta.data.name ?? 'file';
//     const type = meta.data.mimeType ?? 'application/octet-stream';

//     // cors és lejátszás
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition, Accept-Ranges');
//     res.setHeader('Content-Type', type);
//     res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);
//     res.setHeader('Accept-Ranges', 'bytes');

//     // stream
//     const driveRes = await drive.files.get(
//       { fileId, alt: 'media' },
//       { responseType: 'stream' }
//     );

//     driveRes.data.on('error', (e: any) => {
//       console.error('Drive stream error', e);
//       if (!res.headersSent) res.status(502).end('Upstream error');
//     });

//     driveRes.data.pipe(res);
//   } catch (err: any) {
//     console.error('File proxy error', err?.message);
//     if (!res.headersSent) res.status(404).json({ message: 'File not found' });
//   }
// });

// // preflight
// router.options('/files/:id', (_req, res) => {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
//   res.status(204).end();
// });

// export default router;

import express from 'express';
import drive from '../utils/drive';

const router = express.Router();

router.get('/files/:id', async (req, res) => {
  try {
    const fileId = req.params.id;

    const meta = await drive.files.get({
      fileId,
      fields: 'name,mimeType,size',
    });

    const name = meta.data.name ?? 'file';
    const type = meta.data.mimeType ?? 'application/octet-stream';
    const size = Number(meta.data.size || 0);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Type, Content-Length, Content-Disposition, Accept-Ranges, Content-Range'
    );
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(name)}"`);

    const range = req.headers.range as string | undefined;

    if (range && size > 0) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024 - 1, size - 1);
      const chunkSize = end - start + 1;

      const driveRes = await drive.files.get(
        { fileId, alt: 'media' },
        {
          responseType: 'stream',
          headers: { Range: `bytes=${start}-${end}` },
        }
      );

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', String(chunkSize));

      driveRes.data.on('error', (e: any) => {
        console.error('Drive range stream error', e);
        if (!res.headersSent) res.status(502).end('Upstream error');
      });

      driveRes.data.pipe(res);
      return;
    }

    if (size > 0) res.setHeader('Content-Length', String(size));

    const driveRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    driveRes.data.on('error', (e: any) => {
      console.error('Drive stream error', e);
      if (!res.headersSent) res.status(502).end('Upstream error');
    });

    res.status(200);
    driveRes.data.pipe(res);
  } catch (err: any) {
    console.error('File proxy error', err?.message);
    if (!res.headersSent) res.status(404).json({ message: 'File not found' });
  }
});

// preflight
router.options('/files/:id', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.status(204).end();
});

export default router;

