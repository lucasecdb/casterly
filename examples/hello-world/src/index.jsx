import React from 'react'

const App = () => {
  const [counter, setCounter] = React.useState(0)

  React.useEffect(() => {
    setInterval(() => {
      setCounter(prevCounter => prevCounter + 1)
    }, 1000)
  }, [])

  return (
    <>
      <p>Hello world!</p>
      <p>{counter} seconds elapsed</p>
    </>
  )
}

export default App
