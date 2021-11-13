export const loaderMetadata = ({ params }) => {
  return { params }
}

export default function PreloadData({ preloadedData }) {
  return <div>{JSON.stringify(preloadedData)}</div>
}
