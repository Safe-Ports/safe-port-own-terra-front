function Home() {
  return (
    <main className="home-page">
      <section className="hero-section">
        <span className="app-badge">OwnTerra</span>

        <h1>Control total sobre tus lotes y procesos inmobiliarios</h1>

        <p>
          OwnTerra es una plataforma diseñada para centralizar la gestión,
          seguimiento y administración de procesos relacionados con lotes,
          clientes, pagos, documentos y avances de adquisición.
        </p>

        <div className="hero-actions">
          <button type="button">Explorar plataforma</button>
          <button type="button" className="secondary-button">
            Ver documentación
          </button>
        </div>
      </section>
    </main>
  );
}

export default Home;