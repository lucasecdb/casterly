import { Link, Outlet } from 'react-router-dom'

export default function LinksPage() {
  return (
    <div>
      <p>Links</p>
      <ul>
        <li>
          <Link to="/back-link">Go to /back-link</Link>
        </li>
        <li>
          <Link to="lonks">Go to lonks</Link>
        </li>
      </ul>

      <Outlet />
    </div>
  )
}
