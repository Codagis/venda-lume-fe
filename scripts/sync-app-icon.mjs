import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
copyFileSync(
  join(root, 'resources', 'images', 'AppIcon.svg'),
  join(root, 'public', 'AppIcon.svg'),
)
