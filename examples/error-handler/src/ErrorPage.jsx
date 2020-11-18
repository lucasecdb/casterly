const ErrorPage = ({ error }) => {
  return (
    <div>
      <h1>An error has ocurred</h1>

      <p>{error.message}</p>
      <pre>
        {''}
        <code>{error.stack}</code>
        {''}
      </pre>
    </div>
  )
}

export default ErrorPage
