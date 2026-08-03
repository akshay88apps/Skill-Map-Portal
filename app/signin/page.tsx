import { signIn } from '@/auth';
export default function SignIn() {
  return (
    <main className="grid min-h-screen place-items-center bg-forest p-6">
      <section className="card w-full max-w-md p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-moss">
          Tech Leaders Portal
        </p>
        <h1 className="mt-3 text-3xl font-black">Sign in to Skillmap</h1>
        <p className="mt-3 text-sm text-ink/55">
          Use your organisation Microsoft account. Access is restricted to
          approved leaders and HR administrators.
        </p>
        <form
          action={async () => {
            'use server';
            await signIn('microsoft-entra-id', { redirectTo: '/' });
          }}
        >
          <button className="btn mt-7 w-full" type="submit">
            Continue with Microsoft
          </button>
        </form>
      </section>
    </main>
  );
}
