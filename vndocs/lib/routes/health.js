/** GET /api/health — checagem rápida de que o motor está de pé. */
export function GET() {
  return Response.json({ ok: true, service: 'ndocs-engine', phase: 1 });
}
