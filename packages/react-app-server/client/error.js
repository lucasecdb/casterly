import React from 'react'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
  },
  message: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    fontFamily: 'sans-serif',
  },
  stack: {
    marginTop: '.5rem',
    color: 'rgba(0, 0, 0, .57)',
  },
}

const ErrorPage = ({ error }) => {
  return (
    <>
      <div style={styles.container}>
        <h1 style={styles.message}>{error.message}</h1>
        <pre style={styles.stack}>{error.stack}</pre>
      </div>
    </>
  )
}

export default ErrorPage
