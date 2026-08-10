import { signIn } from '@/auth';
import { Button } from '@/components/ui';
export default function SignIn() {
  return (
    <main className="grid min-h-screen place-items-center bg-primary-900 p-6">
      <section className="card w-full max-w-md p-8 text-center">
        <p className="eyebrow">Tech Leaders Portal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Sign in to Skillmap
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Use your organisation Microsoft account. Access is restricted to
          approved leaders and HR administrators.
        </p>
        <form
          action={async () => {
            'use server';
            await signIn('microsoft-entra-id', { redirectTo: '/' });
          }}
        >
          <Button className="mt-8 w-full" type="submit">
            Continue with Microsoft
          </Button>
        </form>
      </section>
    </main>
  );
}
