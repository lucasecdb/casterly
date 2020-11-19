import { Outlet } from 'react-router'

import InternalLink from './InternalLink'

const OtherPage = ({ name }) => {
  return (
    <div>
      <p>Welcome to the other page, {name}!</p>
      <InternalLink to="/">Go back</InternalLink>
      <Outlet />
    </div>
  )
}

export default OtherPage
