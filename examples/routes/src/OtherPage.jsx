import { Link, Outlet } from 'react-router-dom'

const OtherPage = () => {
  return (
    <div>
      <p>Welcome to the other page!</p>
      <Link to="/">Go back</Link>
      <Outlet />
    </div>
  )
}

export default OtherPage
