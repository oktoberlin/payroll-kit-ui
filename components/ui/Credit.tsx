const LINKS = [
  { label: "Upwork", href: "https://www.upwork.com/freelancers/~01d3f113442000dd06" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/oktoberlin-tampubolon-b621b711b/" },
];

export function Credit({ className }: { className?: string }) {
  return (
    <p className={`m-0 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[13px] text-ink-3 ${className ?? ""}`}>
      <span>Built by Oktoberlin Tampubolon</span>
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink no-underline hover:border-ink hover:no-underline"
        >
          {link.label}
        </a>
      ))}
    </p>
  );
}
