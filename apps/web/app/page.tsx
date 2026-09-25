const cards = [
  ['Times', 'Estrutura dos times e seus gestores'],
  ['Cargos', 'Cargos, steps e faixas salariais'],
  ['Qualificações', 'Cursos, conhecimentos e experiência'],
  ['Promoções', 'Acompanhamento e aprovação de progressões'],
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white">
        PDI · Bootstrap
      </span>
      <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight">
        Desenvolvimento de carreira de forma clara e mensurável.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-slate-600">
        Estrutura inicial do sistema para organizar times, cargos, steps, qualificações e promoções.
      </p>
      <section className="mt-12 grid gap-4 md:grid-cols-2">
        {cards.map(([title, description]) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-slate-600">{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
