export function Nosotros() {
  return (
    <div className="container py-5">
      <h1 className="mb-4">Sobre ArtCrate</h1>
      <div className="row g-4 align-items-center">
        <div className="col-md-6">
          <p>
            ArtCrate nació de una idea simple: que conseguir buenos materiales de arte sea fácil y que cualquiera pueda
            empezar a crear. Reunimos pinturas, lienzos, cuadernos de dibujo y accesorios de calidad en un solo lugar.
          </p>
          <section>
            <h2 className="h4">Nuestra propuesta</h2>
            <ul>
              <li>Materiales para principiantes y artistas con experiencia.</li>
              <li>Kits ArtCrate pensados para empezar sin gastar de más.</li>
              <li>Atención cercana para resolver tus dudas antes de comprar.</li>
            </ul>
          </section>
        </div>
        <div className="col-md-6">
          <figure className="mb-0">
            <img src="/assets/img/nosotros-taller.jpg" className="img-fluid rounded detalle-imagen" alt="Mesa de un taller con pinceles y tarros de pintura" width="1280" height="853" />
            <figcaption className="text-secondary mt-2">El taller es donde empieza cada obra. Foto: Khara Woods (CC0), Wikimedia Commons.</figcaption>
          </figure>
        </div>
      </div>
    </div>
  )
}
