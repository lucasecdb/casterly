import { Link } from 'react-app-server/router'

const OtherPage = () => {
  return (
    <div>
      <p>Welcome to the other page!</p>
      <Link to="/">Go back</Link>
    </div>
  )
}

export default OtherPage
