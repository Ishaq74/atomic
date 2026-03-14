import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Supprime un fichier uploadé à partir de son URL publique.
 * Ex: deleteUpload('/uploads/images/avatars/abc-123.jpg')
 */
export async function deleteUpload(url: string): Promise<void> {
  // Sécurité : n'accepter que les URLs commençant par /uploads/
  if (!url.startsWith('/uploads/')) {
    throw new Error('URL invalide — seuls les fichiers dans /uploads/ peuvent être supprimés');
  }

  // Résoudre le chemin absolu et vérifier qu'il reste dans public/uploads/
  const uploadsRoot = resolve(process.cwd(), 'public', 'uploads');
  const filePath = resolve(process.cwd(), 'public', url);

  if (!filePath.startsWith(uploadsRoot)) {
    throw new Error('Chemin invalide — tentative de path traversal détectée');
  }

  await unlink(filePath);
}
