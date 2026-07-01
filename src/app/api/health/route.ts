// Liveness probe: is the process up and serving? No dependencies are touched, so
// this stays green even when Postgres/Redis are down — that's the readiness
// probe's job (/api/health/ready). Load balancers use this to decide restarts.

export const dynamic = "force-dynamic"; // never cache; must reflect the live process

export async function GET() {
  return Response.json({ status: "ok", uptime: process.uptime() });
}
