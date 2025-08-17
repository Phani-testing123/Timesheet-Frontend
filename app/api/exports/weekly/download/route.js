export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const resp = await fetch('http://127.0.0.1:8000/exports/weekly/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(text || 'Backend error', {
        status: resp.status,
        headers: { 'content-type': resp.headers.get('content-type') || 'text/plain' },
      });
    }

    const buf = await resp.arrayBuffer();
    const headers = new Headers(resp.headers);
    if (!headers.get('Content-Type')) {
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
    if (!headers.get('Content-Disposition')) {
      headers.set('Content-Disposition', 'attachment; filename="Timesheet.xlsx"');
    }
    return new Response(buf, { status: 200, headers });
  } catch (err) {
    return new Response(`Proxy error: ${String(err)}`, { status: 502, headers: { 'content-type': 'text/plain' } });
  }
}
