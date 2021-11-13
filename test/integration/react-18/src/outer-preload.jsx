import { Outlet } from 'react-router-dom'

export const loaderMetadata = ({ params }) => {
  return { params }
}

export default function OuterPreload({ preloadedData }) {
  return (
    <div>
      <Outlet />
      <pre>{JSON.stringify(preloadedData)}</pre>
    </div>
  )
}
