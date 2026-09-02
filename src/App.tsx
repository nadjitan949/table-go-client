import { BrowserRouter, Route, Routes } from "react-router-dom"
import MenuPage from "./pages/MenuPage"
import LandingPage from "./pages/LandingPage"

function App() {

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/:token" element={<LandingPage/>} />
          <Route path="/menu/:token" element={<MenuPage />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
