import { Link } from 'react-router-dom'

export default function IndexPage() {
  return (
    <div>
      <p>Links</p>
      <ul>
        <li>
          <Link to="/back-link">Go to /back-link</Link>
        </li>
      </ul>
    </div>
  )
}
