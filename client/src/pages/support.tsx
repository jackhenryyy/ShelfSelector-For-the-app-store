export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-xl border border-black p-6 sm:p-8 bg-white">
        <h1 className="text-2xl font-mono mb-4">support</h1>
        <p className="text-sm font-mono text-black/80 mb-6">
          Need help with The Shelf? Reach out and we will get back to you as soon as possible.
        </p>
        <p className="text-sm font-mono">
          email:{" "}
          <a
            href="mailto:support@theshelfproject.com"
            className="underline underline-offset-2 hover:text-black/70"
          >
            support@theshelfproject.com
          </a>
        </p>
      </div>
    </div>
  );
}
