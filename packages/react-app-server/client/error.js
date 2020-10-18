import { Head } from '../server/lib/head'

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
      <Head
        title="Rendering Error"
        style={[{ cssText: `* { margin: 0; padding: 0; }` }]}
        meta={[{ name: 'robot', content: 'noindex, nofollow' }]}
      />
      <div style={styles.container}>
        <h1 style={styles.message}>{error.message}</h1>
        <pre style={styles.stack}>{error.stack}</pre>
      </div>
    </>
  )
}

export default ErrorPage
