export default function PolicyBody({ sections }: { sections: Array<{ title: string; body: string }> }) {
  return (
    <div className="max-w-3xl space-y-8">
      {sections.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          <p className="leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
    </div>
  );
}
