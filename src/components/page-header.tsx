export function PageHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-primary">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-foreground">
        {title}
      </h1>
      {body && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
    </div>
  );
}
