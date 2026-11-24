import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cada prueba parte con el DOM y el localStorage vacíos
afterEach(() => {
  cleanup()
  localStorage.clear()
})
