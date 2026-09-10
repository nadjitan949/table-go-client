import { BrowserRouter, Route, Routes } from "react-router-dom"
import MenuPage from "./pages/home/MenuPage"
import LandingPage from "./pages/home/LandingPage"
import DetailsMenu from "./pages/home/components/DetailsMenu"
import OrderPages from "./pages/order/OrderPages"
import OrderListPage from "./pages/order/OrderListPage"
import OrdersCart from "./components/OrdersCart"

function App() {

  return (
    <>
      <BrowserRouter>
        <OrdersCart />
        <Routes>
          <Route path="/:token" element={<LandingPage />} />
          <Route path="/menu/:token" element={<MenuPage />} />
          <Route path="/menu/:token/:id" element={<DetailsMenu />} />
          <Route path="/orders/:token" element={<OrderListPage />} />
          <Route path="/orders/:token/:orderId" element={<OrderPages />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
