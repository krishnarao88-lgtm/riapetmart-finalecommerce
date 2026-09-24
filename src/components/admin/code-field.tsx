export function CodeField({ error }: { error?: string }) {
  return (
    <label htmlFor="code" className="grid gap-2 font-semibold">
      6-digit code
      <input
        id="code"
        name="code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "code-error" : undefined}
        className="min-h-12 rounded-xl border-2 border-line bg-ground px-3 text-base font-normal tracking-widest focus:border-grape"
      />
      {error && (
        <span id="code-error" role="alert" className="text-sm font-medium text-bad-fg">
          {error}
        </span>
      )}
    </label>
  );
}
