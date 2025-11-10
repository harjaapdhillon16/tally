export default function LoginPage() {
  return (
    <main className="container p-8">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p>Please sign in to continue.</p>
      <a href="/api/auth/signin" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">Sign in</a>
    </main>
  );
}
