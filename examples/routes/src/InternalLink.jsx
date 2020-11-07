import { useIsRoutePending } from '@app-server/components'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import LoadingIndicator from './LoadingIndicator'
import styles from './styles.module.css'

const InternalLink = (props) => {
  const isPending = useIsRoutePending()

  const [showLoading, setShowLoading] = useState(isPending)

  useEffect(() => {
    if (!isPending) {
      setShowLoading(false)
      return
    }

    const id = setTimeout(() => {
      setShowLoading(true)
    }, 300)

    return () => {
      clearTimeout(id)
    }
  }, [isPending])

  return (
    <Link
      {...props}
      className={styles.link + (props.className ? ' ' + props.className : '')}
    >
      {props.children} {showLoading && <LoadingIndicator />}
    </Link>
  )
}

export default InternalLink
