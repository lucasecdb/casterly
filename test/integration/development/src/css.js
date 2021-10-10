import styles from './css.module.css'
import './css.css'

export default function CssPage() {
  return (
    <div>
      <p className={styles.red}>i should be red</p>
      <span className="blue">and I should be blue</span>
    </div>
  )
}
