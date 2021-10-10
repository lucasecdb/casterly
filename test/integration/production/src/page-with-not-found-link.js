import { Link } from 'react-router-dom'

export default function PageWithNotFoundLink() {
  return (
    <div>
      <Link id="click-me" to="/i-dont-know-where-this-is-going">
        click me
      </Link>
    </div>
  )
}
