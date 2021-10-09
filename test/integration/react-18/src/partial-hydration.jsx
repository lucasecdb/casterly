import { Suspense, lazy } from 'react'

const DynamicComponent = lazy(() =>
  import(/* webpackChunkName: "dynamic-component" */ './DynamicComponent')
)

const PartialHydrationPage = () => {
  if (typeof window !== 'undefined') {
    window.reactIsHydrated = true
  }

  return (
    <div>
      <p>Hello world!</p>
      <Suspense fallback="loading...">
        <DynamicComponent />
      </Suspense>
    </div>
  )
}

export default PartialHydrationPage
