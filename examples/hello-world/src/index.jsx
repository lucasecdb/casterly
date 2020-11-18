import { useEffect, useState } from 'react'

const IndexPage = () => {
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCounter((prevCounter) => prevCounter + 1)
    }, 1000)

    return () => {
      clearInterval(id)
    }
  }, [])

  return (
    <>
      <p>Hello world!</p>
      <p>{counter} seconds elapsed</p>
    </>
  )
}

export default IndexPage
