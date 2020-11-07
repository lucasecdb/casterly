import { Outlet } from 'react-router'

import InternalLink from './InternalLink'

const OtherPage = () => {
  return (
    <div>
      <p>Welcome to the other page!</p>
      <InternalLink to="/">Go back</InternalLink>
      <Outlet />
    </div>
  )
}

export default OtherPage
