import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Loading from './pages/Loading'
import Result from './pages/Result'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </BrowserRouter>
  )
}
