import { BrowserRouter, Route, Routes } from "react-router-dom"
import MenuPage from "./pages/MenuPage"

function App() {

  return (
    <>
      <BrowserRouter>
            <Routes>
                <Route path="/menu/:token" element={<MenuPage />} />
            </Routes>
        </BrowserRouter>
    </>
  )
}

export default App
