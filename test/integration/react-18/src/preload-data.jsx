export const loaderMetadata = () => {
  return 1
}

export default function PreloadData({ preloadedData }) {
  return <div>{JSON.stringify(preloadedData)}</div>
}
