export const dynamic = 'force-dynamic';

export async function GET() {
  const resp = await fetch('http://127.0.0.1:8000/healthz');
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { 'content-type': 'application/json' },
  });
}
