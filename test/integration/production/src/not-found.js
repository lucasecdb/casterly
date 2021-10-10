import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div>
      <p>you did not found me 😜</p>
      <Link to="/">go back</Link>
    </div>
  )
}
