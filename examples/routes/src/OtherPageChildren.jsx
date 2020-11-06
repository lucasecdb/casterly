import { useIsRoutePending } from '@app-server/components'
import { Link } from 'react-router-dom'

import LoadingIndicator from './LoadingIndicator'
import styles from './styles.module.css'

const OtherPageChildren = () => {
  const isPending = useIsRoutePending()

  return (
    <div>
      <p>Hi, I'm the children!</p>
      <Link className={styles.link} to="/other-page">
        Go to top page {isPending && <LoadingIndicator />}
      </Link>
    </div>
  )
}

export default OtherPageChildren
