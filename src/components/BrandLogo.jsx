const SRC = '/brand/robustrix-logo.png'

export default function BrandLogo({ className = '', alt = 'Robustrix' }) {
  return <img className={`brand-logo ${className}`.trim()} src={SRC} alt={alt} />
}

export function PoweredBy({ className = '', as: Tag = 'p' }) {
  return (
    <Tag className={`powered ${className}`.trim()}>
      Powered by <b>Robustrix IT Solution Pvt Ltd</b>
    </Tag>
  )
}
