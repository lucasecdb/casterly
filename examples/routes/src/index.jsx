import { useIsRoutePending } from '@app-server/components'
import { Link } from 'react-router-dom'

import LoadingIndicator from './LoadingIndicator'
import styles from './styles.module.css'

const IndexPage = () => {
  const isPending = useIsRoutePending()

  return (
    <>
      <p>Hello world!</p>
      <Link className={styles.link} to="/other-page">
        Go to other page {isPending && <LoadingIndicator />}
      </Link>
    </>
  )
}

export default IndexPage
