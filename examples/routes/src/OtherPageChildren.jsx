import { Link } from 'react-router-dom'

const OtherPageChildren = () => {
  return (
    <div>
      <p>Hi, I'm the children!</p>
      <Link to="/other-page">Go to top page</Link>
    </div>
  )
}

export default OtherPageChildren
