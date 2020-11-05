import { useIsRoutePending } from '@app-server/components'
import { Link, Outlet } from 'react-router-dom'

import LoadingIndicator from './LoadingIndicator'
import styles from './styles.module.css'

const OtherPage = () => {
  const isPending = useIsRoutePending()

  return (
    <div>
      <p>Welcome to the other page!</p>
      <Link className={styles.link} to="/">
        Go back {isPending && <LoadingIndicator />}
      </Link>
      <Outlet />
    </div>
  )
}

export default OtherPage
