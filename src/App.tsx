import { BrowserRouter, Route, Routes } from "react-router-dom"
import MenuPage from "./pages/home/MenuPage"
import LandingPage from "./pages/home/LandingPage"
import DetailsMenu from "./pages/home/components/DetailsMenu"

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/:token" element={<LandingPage/>} />
          <Route path="/menu/:token" element={<MenuPage />} />
          <Route path="/menu/:token/:id" element={<DetailsMenu />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
