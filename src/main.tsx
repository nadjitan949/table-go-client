import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import OrdersCart from './components/OrdersCart.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <OrdersCart/>
  </StrictMode>,
)
