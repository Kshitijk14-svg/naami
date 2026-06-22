import { getUser } from '@/models/userStore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!email) {
      return Response.json({ error: 'Email is required.' }, { status: 400 });
    }

    const user = getUser(email);
    return Response.json({ exists: !!user });
  } catch (err) {
    console.error('[check-user]', err);
    return Response.json({ error: 'Failed to check user.' }, { status: 500 });
  }
}
