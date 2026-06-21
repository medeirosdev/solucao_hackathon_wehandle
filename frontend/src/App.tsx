import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home    from './pages/Home'
import Loading from './pages/Loading'
import Result  from './pages/Result'
import Logs    from './pages/Logs'
import Costs   from './pages/Costs'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"       element={<Home />}    />
        <Route path="/loading" element={<Loading />} />
        <Route path="/result"  element={<Result />}  />
        <Route path="/logs"    element={<Logs />}    />
        <Route path="/costs"   element={<Costs />}   />
      </Routes>
    </BrowserRouter>
  )
}
