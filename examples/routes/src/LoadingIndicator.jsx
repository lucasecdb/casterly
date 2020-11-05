import styles from './LoadingIndicator.module.css'

const LoadingIndicator = () => {
  return (
    <svg
      className={styles.loading}
      viewBox="0 0 24 24"
      height="16"
      width="16"
      fill="none"
      aria-hidden
    >
      <circle
        className={styles.circle}
        r="10"
        cx="12"
        cy="12"
        stroke="darkslateblue"
        strokeWidth={4}
      />
      <path
        className={styles.path}
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export default LoadingIndicator
