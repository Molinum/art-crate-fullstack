import { Link } from 'react-router-dom'

const PREGUNTAS = [
  { tema: 'Envíos', p: '¿Cuánto demora el envío de mi pedido?', r: 'Despachamos en 1 a 2 días hábiles. En Santiago la entrega toma de 2 a 3 días hábiles y en regiones de 3 a 6 días hábiles.' },
  { tema: 'Envíos', p: '¿Cuánto cuesta el despacho?', r: 'El costo depende de tu comuna y del peso del pedido, y se muestra antes de pagar. Las compras sobre $50.000 tienen despacho gratis en la Región Metropolitana.' },
  { tema: 'Devoluciones', p: '¿Puedo devolver un producto?', r: 'Sí. Tienes 10 días corridos desde la recepción para devolver productos sin uso y en su empaque original.' },
  { tema: 'Devoluciones', p: '¿Qué hago si mi producto llegó dañado?', r: 'Escríbenos desde la página de Contacto con una foto del producto y el número de tu pedido. Lo reemplazamos o te devolvemos el dinero.' },
  { tema: 'Medios de pago', p: '¿Qué medios de pago aceptan?', r: 'Aceptamos tarjetas de crédito y débito, y transferencia bancaria.' },
  { tema: 'Medios de pago', p: '¿Es seguro pagar en ArtCrate?', r: 'Sí. No guardamos los datos de tu tarjeta; el pago se realiza a través de una plataforma de pagos externa.' },
]

export function Faq() {
  return (
    <div className="container py-5">
      <h1 className="mb-4">Preguntas frecuentes</h1>
      <div className="accordion" id="preguntas">
        {PREGUNTAS.map((q, i) => (
          <div className="accordion-item" key={q.p}>
            <h2 className="accordion-header">
              <button
                className={`accordion-button ${i === 0 ? '' : 'collapsed'}`}
                type="button"
                data-bs-toggle="collapse"
                data-bs-target={`#respuesta-${i}`}
                aria-expanded={i === 0}
                aria-controls={`respuesta-${i}`}
              >
                {q.p}
              </button>
            </h2>
            <div id={`respuesta-${i}`} className={`accordion-collapse collapse ${i === 0 ? 'show' : ''}`} data-bs-parent="#preguntas">
              <div className="accordion-body">
                <p className="text-secondary small mb-1">{q.tema}</p>
                {q.r}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4">¿No encuentras tu respuesta? <Link to="/contacto">Escríbenos</Link>.</p>
    </div>
  )
}
